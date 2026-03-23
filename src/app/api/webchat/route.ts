import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export async function GET(req: NextRequest) {
  const shopSlug = req.nextUrl.searchParams.get("shop_slug");
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!shopSlug) {
    return NextResponse.json({ active: false });
  }
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
      .select("id, is_active")
      .eq("shop_id", shop.id)
      .eq("platform", "webchat")
      .single();

    const active = channel?.is_active ?? false;
    if (!active) return NextResponse.json({ active: false });
    if (!channel) return NextResponse.json({ active: false });

    // Without a session_id we only need to answer "is the widget active?"
    if (!sessionId) return NextResponse.json({ active: true });

    // Find the existing conversation for this session_id + shop channel.
    const { data: existingConvRows } = await supabase
      .from("messaging_conversations")
      .select("id, customer_name")
      .eq("channel_id", channel.id)
      .eq("platform_conversation_id", sessionId)
      .limit(1);

    const existingConv = existingConvRows?.[0] ?? null;
    if (!existingConv) {
      return NextResponse.json({
        active: true,
        conversation_id: null,
        customer_name: null,
        history: [],
      });
    }

    const conversationId = existingConv.id;

    const { data: historyRows } = await supabase
      .from("messaging_messages")
      .select("id, direction, content, content_type, metadata, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Return chronological order for the UI.
    const history = (historyRows ?? []).reverse();

    return NextResponse.json({
      active: true,
      conversation_id: conversationId,
      customer_name: existingConv.customer_name,
      history,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient();

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

      shop_slug = String(formData.get("shop_slug") ?? "");
      session_id = String(formData.get("session_id") ?? "");
      sender_name = String(formData.get("sender_name") ?? "");
      messageContent = String(formData.get("content") ?? "");
      caption = String(formData.get("caption") ?? "");

      const requestedContentType = String(formData.get("content_type") ?? "text");
      content_type = requestedContentType === "image" ? "image" : "text";

      const maybeFile = formData.get("image");
      if (maybeFile instanceof File) {
        imageFile = maybeFile;
      }
    } else {
      const body = (await req.json()) as {
        shop_slug: string;
        session_id: string;
        sender_name?: string;
        content?: string;
        content_type?: "text" | "image";
        caption?: string;
      };

      shop_slug = body.shop_slug;
      session_id = body.session_id;
      sender_name = body.sender_name ?? "Guest";
      messageContent = body.content ?? "";
      content_type = body.content_type ?? "text";
      caption = body.caption ?? "";
    }

    if (!shop_slug || !session_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (content_type !== "text" && content_type !== "image") {
      return NextResponse.json({ error: "Unsupported content_type" }, { status: 400 });
    }

    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("slug", shop_slug)
      .single();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const { data: channel } = await supabase
      .from("messaging_channels")
      .select("id")
      .eq("shop_id", shop.id)
      .eq("platform", "webchat")
      .eq("is_active", true)
      .single();

    if (!channel) {
      return NextResponse.json({ error: "Web chat not enabled for this shop" }, { status: 404 });
    }

    const { data: existingConv } = await supabase
      .from("messaging_conversations")
      .select("id")
      .eq("channel_id", channel.id)
      .eq("platform_conversation_id", session_id)
      .single();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
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
        .select("id")
        .single();

      if (convErr || !newConv) {
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
      }

      conversationId = newConv.id;
    }

    let finalContent = messageContent;
    const finalContentType: "text" | "image" = content_type;
    const finalMetadata: Record<string, unknown> = {};

    if (finalContentType === "image") {
      if (!imageFile) {
        return NextResponse.json({ error: "Missing image file" }, { status: 400 });
      }
      if (!imageFile.type.startsWith("image/")) {
        return NextResponse.json({ error: "Invalid image mime type" }, { status: 400 });
      }
      // Keep uploads modest for a storefront widget.
      const maxSizeBytes = 3 * 1024 * 1024;
      if (imageFile.size > maxSizeBytes) {
        return NextResponse.json({ error: "Image too large (max 3MB)" }, { status: 400 });
      }

      const extFromName = imageFile.name.split(".").pop();
      const ext = (extFromName && extFromName.length <= 10 ? extFromName : "png").toLowerCase();
      const path = `${shop.id}/conversations/${conversationId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("chat-images")
        .upload(path, imageFile, { upsert: false, contentType: imageFile.type });

      if (uploadErr) {
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
      }

      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      finalContent = urlData.publicUrl;
      if (caption.trim()) finalMetadata.caption = caption.trim().slice(0, 512);
    } else {
      if (!messageContent.trim()) {
        return NextResponse.json({ error: "Missing message content" }, { status: 400 });
      }
      finalContent = messageContent;
    }

    await supabase.from("messaging_messages").insert({
      conversation_id: conversationId,
      direction: "inbound",
      sender_id: session_id,
      sender_name: sender_name || "Guest",
      content: finalContent,
      content_type: finalContentType,
      metadata: (Object.keys(finalMetadata).length > 0 ? finalMetadata : null) as Json | null,
    });

    return NextResponse.json({ ok: true, conversation_id: conversationId });
  } catch (err) {
    console.error("Webchat API error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
