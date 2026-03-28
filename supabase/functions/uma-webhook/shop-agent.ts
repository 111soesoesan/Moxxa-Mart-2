import { generateText, stepCountIs, type ModelMessage } from "npm:ai";
import { buildAITools, buildSystemPrompt, createGeminiModel } from "./chat-engine.ts";

const MAX_AGENT_STEPS = 5;
const SHOP_AI_MODEL_ID = "gemini-2.5-flash";

export type UmaAiTraceEmit = (
  stage: string,
  extra?: Record<string, unknown>,
  startedAt?: number
) => number;

export type PersonaRow = {
  id: string;
  name: string;
  description_template: string;
  system_prompt: string;
  temperature?: number | null;
  is_active?: boolean;
};

function serializeAiError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const msg = err.message;
    return {
      name: err.name,
      message: msg,
      looksLikeRateLimit:
        /429|rate limit|resource_exhausted|quota|too many requests|resource has been exhausted/i.test(
          msg
        ),
      looksLikeAuth: /401|403|api key|invalid.*key|permission denied|unauthenticated/i.test(
        msg.toLowerCase()
      ),
      stack: err.stack?.slice(0, 800),
      cause:
        err.cause instanceof Error
          ? { name: err.cause.name, message: err.cause.message }
          : err.cause != null
            ? String(err.cause)
            : undefined,
    };
  }
  return { message: String(err) };
}

export function createUmaAiTracer(runId: string): UmaAiTraceEmit {
  return function trace(stage: string, extra?: Record<string, unknown>, startedAt?: number) {
    const source = stage.startsWith("shop_agent") ? "shop_ai" : "uma";
    const at = new Date().toISOString();
    const e: Record<string, unknown> = {
      source,
      runId,
      stage,
      at,
      ...extra,
    };
    if (startedAt != null) e.durationMs = Date.now() - startedAt;
    console.error(`[AI_TRACE] ${JSON.stringify(e)}`);
    return Date.now();
  };
}

const noopTrace: UmaAiTraceEmit = () => Date.now();

// deno-lint-ignore no-explicit-any
async function persistAiConversationLog(supabase: any, params: {
  shopId: string;
  personaId: string;
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const { data: existing } = await supabase
    .from("ai_conversation_logs")
    .select("id, messages_count, tokens_input, tokens_output")
    .eq("shop_id", params.shopId)
    .eq("session_id", params.sessionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ai_conversation_logs")
      .update({
        messages_count: existing.messages_count + 1,
        tokens_input: existing.tokens_input + params.inputTokens,
        tokens_output: existing.tokens_output + params.outputTokens,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ai_conversation_logs").insert({
      shop_id: params.shopId,
      persona_id: params.personaId,
      session_id: params.sessionId,
      messages_count: 1,
      tokens_input: params.inputTokens,
      tokens_output: params.outputTokens,
    });
    if (error) throw error;
  }
}

// deno-lint-ignore no-explicit-any
async function finalizeGeneration(
  supabase: any,
  shop: { id: string; name: string },
  persona: PersonaRow,
  sessionId: string | undefined,
  result: {
    steps: { length: number };
    finishReason: string;
    totalUsage: { inputTokens?: number | null; outputTokens?: number | null };
  },
  emitTrace: UmaAiTraceEmit
) {
  if (!sessionId) return;

  const hitStepCap =
    result.steps.length >= MAX_AGENT_STEPS && result.finishReason === "tool-calls";
  if (hitStepCap) {
    emitTrace("shop_agent_step_cap", { shopId: shop.id, shopName: shop.name });
  }

  try {
    await persistAiConversationLog(supabase, {
      shopId: shop.id,
      personaId: persona.id,
      sessionId,
      inputTokens: result.totalUsage.inputTokens ?? 0,
      outputTokens: result.totalUsage.outputTokens ?? 0,
    });
    emitTrace("shop_agent_persist_logs_ok", { shopId: shop.id });
  } catch (err) {
    emitTrace("shop_agent_persist_logs_failed", {
      shopId: shop.id,
      error: serializeAiError(err),
    });
  }
}

export type RunShopAgentParams = {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  shop: { id: string; name: string };
  persona: PersonaRow;
  messages: ModelMessage[];
  sessionId: string | undefined;
  emitTrace?: UmaAiTraceEmit;
};

/** Same behavior as Next.js `src/lib/ai/shop-agent.ts` (tools, fallback, token upsert, traces). */
export async function runShopAgentGenerateUma({
  supabase,
  shop,
  persona,
  messages,
  sessionId,
  emitTrace: emitTraceProp,
}: RunShopAgentParams) {
  const emitTrace = emitTraceProp ?? noopTrace;

  emitTrace("shop_agent_start", {
    shopId: shop.id,
    personaId: persona.id,
    messageCount: messages.length,
    sessionIdPresent: Boolean(sessionId),
  });

  const geminiConfigured = Boolean(Deno.env.get("GEMINI_API_KEY")?.trim());
  emitTrace("shop_agent_env", {
    geminiApiKeyConfigured: geminiConfigured,
    model: SHOP_AI_MODEL_ID,
  });

  if (!geminiConfigured) {
    emitTrace("shop_agent_blocked_no_api_key", { shopId: shop.id });
  }

  let model;
  try {
    const t0 = Date.now();
    model = createGeminiModel();
    emitTrace("shop_agent_model_ok", { shopId: shop.id }, t0);
  } catch (err) {
    emitTrace("shop_agent_model_error", {
      shopId: shop.id,
      error: serializeAiError(err),
    });
    throw err;
  }

  const systemPrompt = buildSystemPrompt(
    shop.name,
    persona.description_template,
    persona.system_prompt
  );
  const tools = buildAITools(supabase, shop);
  const temperature = persona.temperature ?? 0.7;
  const toolNames = Object.keys(tools);

  emitTrace("shop_agent_ready", {
    shopId: shop.id,
    personaName: persona.name,
    temperature,
    maxAgentSteps: MAX_AGENT_STEPS,
    toolCount: toolNames.length,
    tools: toolNames,
  });

  const base = {
    model,
    system: systemPrompt,
    messages,
    temperature,
  };

  try {
    emitTrace("shop_agent_generate_tools_begin", { shopId: shop.id });

    const withTools = await generateText({
      ...base,
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      onStepFinish: (event) => {
        emitTrace("shop_agent_step_finish", {
          stepNumber: event.stepNumber,
          finishReason: event.finishReason,
          toolCallCount: event.toolCalls.length,
        });
        event.toolCalls.forEach((call) => {
          console.error(
            "[AI_TRACE]",
            JSON.stringify({
              stage: "tool_call",
              toolName: call.toolName,
              shopId: shop.id,
            })
          );
        });
      },
    });

    emitTrace("shop_agent_generate_tools_end", {
      shopId: shop.id,
      finishReason: withTools.finishReason,
      textLength: withTools.text?.length ?? 0,
      steps: withTools.steps.length,
      warningCount: withTools.warnings?.length ?? 0,
    });

    if (withTools.warnings?.length) {
      emitTrace("shop_agent_model_warnings", {
        shopId: shop.id,
        warningsPreview: JSON.stringify(withTools.warnings).slice(0, 800),
      });
    }

    if (!withTools.text?.trim()) {
      emitTrace("shop_agent_empty_text_retry_plain", {
        shopId: shop.id,
        finishReason: withTools.finishReason,
        steps: withTools.steps.length,
      });
      try {
        const tPlain = Date.now();
        const plain = await generateText(base);
        emitTrace("shop_agent_generate_plain_ok", {
          shopId: shop.id,
          textLength: plain.text?.length ?? 0,
          finishReason: plain.finishReason,
        }, tPlain);
        await finalizeGeneration(supabase, shop, persona, sessionId, plain, emitTrace);
        emitTrace("shop_agent_done", { path: "plain_fallback", shopId: shop.id });
        return plain;
      } catch (plainErr) {
        emitTrace("shop_agent_generate_plain_failed", {
          shopId: shop.id,
          error: serializeAiError(plainErr),
        });
        throw plainErr;
      }
    }

    await finalizeGeneration(supabase, shop, persona, sessionId, withTools, emitTrace);
    emitTrace("shop_agent_done", {
      path: "tools",
      shopId: shop.id,
      textLength: withTools.text.length,
    });
    return withTools;
  } catch (toolErr) {
    emitTrace("shop_agent_generate_tools_failed", {
      shopId: shop.id,
      error: serializeAiError(toolErr),
    });

    try {
      const tPlain = Date.now();
      emitTrace("shop_agent_generate_plain_after_tool_error_begin", { shopId: shop.id });
      const plain = await generateText(base);
      emitTrace("shop_agent_generate_plain_after_tool_error_ok", {
        shopId: shop.id,
        textLength: plain.text?.length ?? 0,
      }, tPlain);
      await finalizeGeneration(supabase, shop, persona, sessionId, plain, emitTrace);
      emitTrace("shop_agent_done", { path: "plain_after_tool_error", shopId: shop.id });
      return plain;
    } catch (plainErr) {
      emitTrace("shop_agent_fatal_both_paths_failed", {
        shopId: shop.id,
        toolPathError: serializeAiError(toolErr),
        plainPathError: serializeAiError(plainErr),
      });
      throw plainErr;
    }
  }
}

async function sendPlatformMessage({
  platform,
  platformConversationId,
  config,
  text,
  senderName,
}: {
  platform: "telegram" | "viber" | "webchat";
  platformConversationId: string;
  config: Record<string, string>;
  text: string;
  senderName: string;
}) {
  if (platform === "telegram" && config.bot_token) {
    await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: platformConversationId,
        text,
      }),
    });
  }

  if (platform === "viber" && config.auth_token) {
    await fetch("https://chatapi.viber.com/pa/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Viber-Auth-Token": config.auth_token,
      },
      body: JSON.stringify({
        receiver: platformConversationId,
        min_api_version: 1,
        sender: { name: senderName },
        tracking_data: platformConversationId,
        type: "text",
        text,
      }),
    });
  }
}

export type MaybeSendAIReplyResult = {
  outcome:
    | "skipped_channel_ai_disabled"
    | "skipped_no_conversation"
    | "skipped_archived"
    | "skipped_conversation_ai_off"
    | "skipped_no_shop"
    | "skipped_no_persona"
    | "skipped_persona_inactive"
    | "skipped_no_user_messages"
    | "replied"
    | "empty_reply"
    | "outbound_insert_failed"
    | "rate_limited"
    | "error";
  runId: string;
  error?: Record<string, unknown>;
};

/** Telegram / Viber AI path — aligned with webchat shop agent + vendor per-thread `ai_active`. */
export async function maybeSendAIReply({
  supabase,
  conversationId,
  channel,
}: {
  // deno-lint-ignore no-explicit-any
  supabase: any;
  conversationId: string;
  channel: {
    shop_id: string;
    platform: "telegram" | "viber" | "webchat";
    config: Record<string, string>;
    ai_enabled?: boolean;
  };
}): Promise<MaybeSendAIReplyResult> {
  const runId = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const trace = createUmaAiTracer(runId);

  if (!channel.ai_enabled) {
    trace("uma_ai_skipped", { reason: "channel_ai_disabled" });
    return { outcome: "skipped_channel_ai_disabled", runId };
  }

  const { data: conversation } = await supabase
    .from("messaging_conversations")
    .select("platform_conversation_id, status, ai_active")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    trace("uma_ai_skipped", { reason: "no_conversation" });
    return { outcome: "skipped_no_conversation", runId };
  }
  if (conversation.status === "archived") {
    trace("uma_ai_skipped", { reason: "archived" });
    return { outcome: "skipped_archived", runId };
  }
  if (conversation.ai_active === false) {
    trace("uma_ai_skipped", { reason: "conversation_ai_active_false" });
    return { outcome: "skipped_conversation_ai_off", runId };
  }

  const { data: shop } = await supabase
    .from("shops")
    .select("id, name")
    .eq("id", channel.shop_id)
    .maybeSingle();
  if (!shop) {
    trace("uma_ai_skipped", { reason: "no_shop" });
    return { outcome: "skipped_no_shop", runId };
  }

  const { data: persona } = await supabase
    .from("ai_personas")
    .select("*")
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (!persona) {
    trace("uma_ai_skipped", { reason: "no_persona", shopId: shop.id });
    return { outcome: "skipped_no_persona", runId };
  }
  if (!persona.is_active) {
    trace("uma_ai_skipped", { reason: "persona_inactive", personaId: persona.id });
    return { outcome: "skipped_persona_inactive", runId };
  }

  const { data: history } = await supabase
    .from("messaging_messages")
    .select("direction, content, content_type")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(30);

  const mapped = ((history ?? []) as Array<Record<string, unknown>>).map((message) => {
    const isUser = message.direction === "inbound";

    if (isUser) {
      const isImageUrl =
        message.content_type === "image" &&
        typeof message.content === "string" &&
        /^https?:\/\//i.test(message.content);

      if (isImageUrl) {
        return {
          role: "user" as const,
          content: [{ type: "image" as const, image: new URL(String(message.content)) }],
        };
      }

      return {
        role: "user" as const,
        content: String(message.content ?? ""),
      };
    }

    return {
      role: "assistant" as const,
      content: String(message.content ?? ""),
    };
  });

  let aiMessages = mapped as ModelMessage[];
  while (aiMessages.length > 0 && aiMessages[0].role !== "user") {
    aiMessages = aiMessages.slice(1);
  }

  if (aiMessages.length === 0) {
    trace("uma_ai_skipped", { reason: "no_user_messages", conversationId });
    return { outcome: "skipped_no_user_messages", runId };
  }

  const sessionKey = String(conversation.platform_conversation_id ?? conversationId);

  trace("uma_ai_invoke_agent", {
    conversationId,
    messageCount: aiMessages.length,
    platform: channel.platform,
  });

  try {
    const result = await runShopAgentGenerateUma({
      supabase,
      shop,
      persona: persona as PersonaRow,
      messages: aiMessages,
      sessionId: sessionKey,
      emitTrace: trace,
    });

    const replyText = result.text?.trim();
    if (!replyText) {
      trace("uma_ai_empty_reply", {
        conversationId,
        finishReason: result.finishReason,
      });
      return { outcome: "empty_reply", runId };
    }

    const { error: insertErr } = await supabase.from("messaging_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      sender_id: null,
      sender_name: String(persona.name ?? "AI Assistant"),
      content: replyText,
      content_type: "text",
      metadata: { is_ai: true, persona_name: persona.name },
    });

    if (insertErr) {
      trace("uma_ai_outbound_insert_failed", {
        conversationId,
        message: insertErr.message,
        code: insertErr.code,
      });
      return { outcome: "outbound_insert_failed", runId, error: { message: insertErr.message } };
    }

    if (
      typeof conversation.platform_conversation_id === "string" &&
      conversation.platform_conversation_id
    ) {
      await sendPlatformMessage({
        platform: channel.platform,
        platformConversationId: conversation.platform_conversation_id,
        config: channel.config,
        text: replyText,
        senderName: String(persona.name ?? "AI Assistant"),
      });
      trace("uma_ai_platform_sent", { platform: channel.platform });
    }

    trace("uma_ai_replied", { conversationId, chars: replyText.length });
    return { outcome: "replied", runId };
  } catch (aiErr) {
    const ser = serializeAiError(aiErr);
    trace("uma_ai_error", { error: ser });
    const outcome = ser.looksLikeRateLimit ? "rate_limited" : "error";
    return { outcome, runId, error: ser };
  }
}
