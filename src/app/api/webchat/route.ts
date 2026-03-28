import { NextRequest, NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import { createServiceClient } from "@/lib/supabase/server";
import { runShopAgentGenerate } from "@/lib/ai/shop-agent";
import {
  createRequestAiTracer,
  serializeAiError,
  webchatAiDiagnosticsInResponse,
} from "@/lib/ai/ai-trace";
import type { Json } from "@/types/supabase";

export async function GET(req: NextRequest) {
  const shopSlug = req.nextUrl.searchParams.get("shop_slug");
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!shopSlug) return NextResponse.json({ active: false });

  try {
    const supabase = await createServiceClient();

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("slug", shopSlug)
      .single();
    if (!shop) return NextResponse.json({ active: false });

    const { data: channel } = await supabase
      .from("messaging_channels")
      .select("id, is_active, ai_enabled")
      .eq("shop_id", shop.id)
      .eq("platform", "webchat")
      .single();

    const shouldShowWidget = !!(channel?.is_active || channel?.ai_enabled);
    if (!shouldShowWidget || !channel) return NextResponse.json({ active: false });
    if (!sessionId) return NextResponse.json({ active: shouldShowWidget });

    const { data: existingConvRows } = await supabase
      .from("messaging_conversations")
      .select("id, customer_name")
      .eq("channel_id", channel.id)
      .eq("platform_conversation_id", sessionId)
      .limit(1);

    const existingConv = existingConvRows?.[0] ?? null;
    if (!existingConv) {
      return NextResponse.json({ active: true, conversation_id: null, customer_name: null, history: [] });
    }

    const conversationId = existingConv.id;
    const { data: historyRows } = await supabase
      .from("messaging_messages")
      .select("id, direction, content, content_type, metadata, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);

    const history = (historyRows ?? []).reverse();
    return NextResponse.json({ active: true, conversation_id: conversationId, customer_name: existingConv.customer_name, history });
  } catch {
    return NextResponse.json({ active: false });
  }
}

export async function POST(req: NextRequest) {
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const { trace, events } = createRequestAiTracer(runId);
  let aiOutcome: string = "not_applicable";
  let aiLastError: Record<string, unknown> | undefined;

  const withDiag = <T extends Record<string, unknown>>(body: T): T => {
    if (!webchatAiDiagnosticsInResponse()) return body;
    return {
      ...body,
      ai_diagnostics: {
        runId,
        outcome: aiOutcome,
        lastError: aiLastError,
        events,
        hint: "Set WEBCHAT_AI_DIAGNOSTICS=0 to hide this object in production.",
      },
    };
  };

  try {
    trace("webchat_post_begin", {
      diagnosticsResponse: webchatAiDiagnosticsInResponse(),
      contentType: (req.headers.get("content-type") ?? "").slice(0, 64),
    });

    const supabase = await createServiceClient();
    trace("webchat_supabase_client_ok", {});

    const contentTypeHeader = req.headers.get("content-type") ?? "";
    const isMultipart = contentTypeHeader.includes("multipart/form-data");

    let shop_slug = "";
    let session_id = "";
    let sender_name = "";
    let messageContent = "";
    let content_type: "text" | "image" = "text";
    let caption = "";
    let imageFile: File | null = null;

    if (isMultipart) {
      const formData = await req.formData();
      shop_slug     = String(formData.get("shop_slug") ?? "");
      session_id    = String(formData.get("session_id") ?? "");
      sender_name   = String(formData.get("sender_name") ?? "");
      messageContent = String(formData.get("content") ?? "");
      caption       = String(formData.get("caption") ?? "");
      const requestedContentType = String(formData.get("content_type") ?? "text");
      content_type  = requestedContentType === "image" ? "image" : "text";
      const maybeFile = formData.get("image");
      if (maybeFile instanceof File) imageFile = maybeFile;
    } else {
      const body = (await req.json()) as {
        shop_slug: string; session_id: string; sender_name?: string;
        content?: string; content_type?: "text" | "image"; caption?: string;
      };
      shop_slug     = body.shop_slug;
      session_id    = body.session_id;
      sender_name   = body.sender_name ?? "Guest";
      messageContent = body.content ?? "";
      content_type  = body.content_type ?? "text";
      caption       = body.caption ?? "";
    }

    if (!shop_slug || !session_id) {
      trace("webchat_reject_missing_fields", {});
      return NextResponse.json(
        withDiag({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id, name")
      .eq("slug", shop_slug)
      .single();
    if (!shop) {
      trace("webchat_reject_shop_not_found", { shop_slug });
      return NextResponse.json(withDiag({ error: "Shop not found" }), { status: 404 });
    }
    trace("webchat_shop_ok", { shopId: shop.id });

    const { data: channel } = await supabase
      .from("messaging_channels")
      .select("id, is_active, ai_enabled")
      .eq("shop_id", shop.id)
      .eq("platform", "webchat")
      .single();
    if (!channel || (!channel.is_active && !channel.ai_enabled)) {
      trace("webchat_reject_channel_disabled", {
        hasChannel: Boolean(channel),
        is_active: channel?.is_active,
        ai_enabled: channel?.ai_enabled,
      });
      return NextResponse.json(
        withDiag({ error: "Web chat not enabled for this shop" }),
        { status: 404 }
      );
    }
    trace("webchat_channel_ok", {
      channelId: channel.id,
      is_active: channel.is_active,
      ai_enabled: channel.ai_enabled,
    });

    // ── Get or create conversation ─────────────────────────────────────────────
    const { data: existingConv } = await supabase
      .from("messaging_conversations")
      .select("id, status, ai_active")
      .eq("channel_id", channel.id)
      .eq("platform_conversation_id", session_id)
      .single();

    let conversationId: string;
    let conversationStatus: string = "open";
    let conversationAiActive = true;

    if (existingConv) {
      conversationId = existingConv.id;
      conversationStatus = existingConv.status ?? "open";
      conversationAiActive = existingConv.ai_active ?? true;
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("messaging_conversations")
        .insert({
          shop_id: shop.id,
          channel_id: channel.id,
          platform: "webchat",
          platform_conversation_id: session_id,
          customer_name: sender_name || "Guest",
          status: "open",
        })
        .select("id, status, ai_active")
        .single();
      if (convErr || !newConv) {
        trace("webchat_conversation_create_failed", {
          message: convErr?.message,
          code: convErr?.code,
        });
        return NextResponse.json(
          withDiag({ error: "Failed to create conversation" }),
          { status: 500 }
        );
      }
      conversationId = newConv.id;
      conversationStatus = newConv.status ?? "open";
      conversationAiActive = newConv.ai_active ?? true;
    }

    // ── Process and save inbound message ──────────────────────────────────────
    let finalContent     = messageContent;
    const finalContentType: "text" | "image" = content_type;
    const finalMetadata: Record<string, unknown> = {};

    if (finalContentType === "image") {
      if (!imageFile) return NextResponse.json({ error: "Missing image file" }, { status: 400 });
      if (!imageFile.type.startsWith("image/")) return NextResponse.json({ error: "Invalid image mime type" }, { status: 400 });
      if (imageFile.size > 3 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 3MB)" }, { status: 400 });

      const extFromName = imageFile.name.split(".").pop();
      const ext = (extFromName && extFromName.length <= 10 ? extFromName : "png").toLowerCase();
      const path = `${shop.id}/conversations/${conversationId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("chat-images")
        .upload(path, imageFile, { upsert: false, contentType: imageFile.type });
      if (uploadErr) return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      finalContent = urlData.publicUrl;
      if (caption.trim()) finalMetadata.caption = caption.trim().slice(0, 512);
    } else {
      if (!messageContent.trim()) return NextResponse.json({ error: "Missing message content" }, { status: 400 });
      finalContent = messageContent;
    }

    const { error: inboundInsertErr } = await supabase.from("messaging_messages").insert({
      conversation_id: conversationId,
      direction: "inbound",
      sender_id: session_id,
      sender_name: sender_name || "Guest",
      content: finalContent,
      content_type: finalContentType,
      metadata: (Object.keys(finalMetadata).length > 0 ? finalMetadata : null) as Json | null,
    });
    if (inboundInsertErr) {
      trace("webchat_inbound_insert_failed", {
        message: inboundInsertErr.message,
        code: inboundInsertErr.code,
      });
      aiOutcome = "inbound_insert_failed";
      aiLastError = { message: inboundInsertErr.message, code: inboundInsertErr.code };
      return NextResponse.json(
        withDiag({ error: "Failed to save message" }),
        { status: 500 }
      );
    }
    trace("webchat_inbound_saved", { conversationId, contentType: finalContentType });

    // ── AI auto-response ───────────────────────────────────────────────────────
    // Only respond if: channel has AI enabled, and the shop has an active persona.
    // Channel "AI" toggle lives in Channel AI assignment (not the widget visibility switch).
    // Per-conversation `ai_active`: vendor can pause AI for this thread from the inbox.
    if (
      !channel.ai_enabled ||
      conversationStatus === "archived" ||
      !conversationAiActive
    ) {
      aiOutcome = "skipped_gate";
      trace("webchat_ai_skipped_gate", {
        channelAiEnabled: channel.ai_enabled,
        conversationStatus,
        conversationAiActive,
      });
    } else {
      try {
        const { data: persona } = await supabase
          .from("ai_personas")
          .select("*")
          .eq("shop_id", shop.id)
          .maybeSingle();

        if (!persona) {
          aiOutcome = "skipped_no_persona";
          trace("webchat_ai_skipped_no_persona", { shopId: shop.id });
        } else if (!persona.is_active) {
          aiOutcome = "skipped_persona_inactive";
          trace("webchat_ai_skipped_persona_inactive", { shopId: shop.id, personaId: persona.id });
        } else {
          // Fetch the last 30 messages (includes the just-saved inbound message)
          const { data: history } = await supabase
            .from("messaging_messages")
            .select("direction, content, content_type")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(30);

          const mapped = (history ?? []).map((msg) => {
            const isUser = msg.direction === "inbound";

            if (isUser) {
              const isImageUrl =
                msg.content_type === "image" &&
                typeof msg.content === "string" &&
                /^https?:\/\//i.test(msg.content);

              if (isImageUrl) {
                return {
                  role: "user" as const,
                  content: [{ type: "image" as const, image: new URL(msg.content) }],
                };
              }

              return {
                role: "user" as const,
                content: msg.content as string,
              };
            }

            return {
              role: "assistant" as const,
              content: msg.content as string,
            };
          });

          // Gemini expects the conversation to start with a user message.
          let aiMessages = mapped as ModelMessage[];
          while (aiMessages.length > 0 && aiMessages[0].role !== "user") {
            aiMessages = aiMessages.slice(1);
          }

          if (aiMessages.length === 0) {
            aiOutcome = "skipped_no_user_messages";
            trace("webchat_ai_skipped_no_user_messages", { conversationId });
          } else {
            trace("webchat_ai_invoke_agent", {
              conversationId,
              messageCount: aiMessages.length,
            });
            const tAgent = Date.now();
            const result = await runShopAgentGenerate({
              supabase,
              shop,
              persona,
              messages: aiMessages,
              sessionId: session_id,
              emitTrace: trace,
            });
            trace("webchat_ai_agent_returned", {
              conversationId,
              finishReason: result.finishReason,
              textLength: result.text?.length ?? 0,
            }, tAgent);

            const reply = result.text?.trim();
            if (reply) {
              const { error: outErr } = await supabase.from("messaging_messages").insert({
                conversation_id: conversationId,
                direction: "outbound",
                sender_id: null,
                sender_name: persona.name,
                content: reply,
                content_type: "text",
                metadata: { is_ai: true, persona_name: persona.name } as Json,
              });
              if (outErr) {
                aiOutcome = "ai_reply_db_insert_failed";
                aiLastError = { message: outErr.message, code: outErr.code };
                trace("webchat_ai_outbound_insert_failed", {
                  conversationId,
                  message: outErr.message,
                  code: outErr.code,
                });
              } else {
                aiOutcome = "replied";
                trace("webchat_ai_outbound_saved", {
                  conversationId,
                  chars: reply.length,
                });
              }
            } else {
              aiOutcome = "empty_reply";
              trace("webchat_ai_empty_reply", {
                conversationId,
                finishReason: result.finishReason,
              });
            }
          }
        }
      } catch (aiErr) {
        aiOutcome = "error";
        aiLastError = serializeAiError(aiErr);
        trace("webchat_ai_caught_error", { error: aiLastError });
        console.error("[Webchat AI] Error generating response:", aiErr);
      }
    }

    trace("webchat_post_done", { aiOutcome });
    return NextResponse.json(
      withDiag({ ok: true, conversation_id: conversationId, ai_outcome: aiOutcome })
    );
  } catch (err) {
    aiOutcome = "handler_error";
    aiLastError = serializeAiError(err);
    console.error("Webchat API error", err);
    try {
      trace("webchat_fatal", { error: aiLastError });
    } catch {
      /* tracer itself failed */
    }
    return NextResponse.json(
      withDiag({ error: "Internal server error", ai_outcome: aiOutcome }),
      { status: 500 }
    );
  }
}
