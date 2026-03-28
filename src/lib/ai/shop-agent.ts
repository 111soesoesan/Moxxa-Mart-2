import { generateText, stepCountIs, type ModelMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { buildSystemPrompt, createGeminiModel, buildAITools } from "./chat-engine";
import {
  type EmitAiTrace,
  serializeAiError,
} from "./ai-trace";

export const MAX_AGENT_STEPS = 5;

/** Logged on init; keep in sync with `createGeminiModel` in chat-engine.ts */
const SHOP_AI_MODEL_ID = "gemini-2.5-flash";

type AiPersonaRow = Database["public"]["Tables"]["ai_personas"]["Row"];

const noopTrace: EmitAiTrace = () => Date.now();

async function persistAiConversationLog(
  supabase: SupabaseClient<Database>,
  {
    shopId,
    personaId,
    sessionId,
    inputTokens,
    outputTokens,
  }: {
    shopId: string;
    personaId: string;
    sessionId: string;
    inputTokens: number;
    outputTokens: number;
  }
) {
  const { data: existing } = await supabase
    .from("ai_conversation_logs")
    .select("id, messages_count, tokens_input, tokens_output")
    .eq("shop_id", shopId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ai_conversation_logs")
      .update({
        messages_count: existing.messages_count + 1,
        tokens_input: existing.tokens_input + inputTokens,
        tokens_output: existing.tokens_output + outputTokens,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ai_conversation_logs").insert({
      shop_id: shopId,
      persona_id: personaId,
      session_id: sessionId,
      messages_count: 1,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
    });
    if (error) throw error;
  }
}

async function finalizeGeneration(
  supabase: SupabaseClient<Database>,
  shop: { id: string; name: string },
  persona: AiPersonaRow,
  sessionId: string | undefined,
  result: {
    steps: { length: number };
    finishReason: string;
    totalUsage: { inputTokens?: number | null; outputTokens?: number | null };
  },
  emitTrace: EmitAiTrace
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

/**
 * Shop AI: tools + step limit, then token logging. Matches UMA webhook behavior by
 * falling back to plain text if tool generation fails or returns no text.
 */
export async function runShopAgentGenerate({
  supabase,
  shop,
  persona,
  messages,
  sessionId,
  emitTrace: emitTraceProp,
}: {
  supabase: SupabaseClient<Database>;
  shop: { id: string; name: string };
  persona: AiPersonaRow;
  messages: ModelMessage[];
  sessionId: string | undefined;
  /** Optional: correlate with /api/webchat diagnostics */
  emitTrace?: EmitAiTrace;
}) {
  const emitTrace = emitTraceProp ?? noopTrace;

  emitTrace("shop_agent_start", {
    shopId: shop.id,
    personaId: persona.id,
    messageCount: messages.length,
    sessionIdPresent: Boolean(sessionId),
  });

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
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
    const tGen = Date.now();
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
