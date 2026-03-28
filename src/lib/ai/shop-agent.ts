import { generateText, stepCountIs, type ModelMessage } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { buildSystemPrompt, createGeminiModel, buildAITools } from "./chat-engine";

export const MAX_AGENT_STEPS = 5;

type AiPersonaRow = Database["public"]["Tables"]["ai_personas"]["Row"];

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
  }
) {
  if (!sessionId) return;

  const hitStepCap =
    result.steps.length >= MAX_AGENT_STEPS && result.finishReason === "tool-calls";
  if (hitStepCap) {
    console.warn(`[Shop AI] Step cap reached for shop "${shop.name}" (${shop.id})`);
  }

  try {
    await persistAiConversationLog(supabase, {
      shopId: shop.id,
      personaId: persona.id,
      sessionId,
      inputTokens: result.totalUsage.inputTokens ?? 0,
      outputTokens: result.totalUsage.outputTokens ?? 0,
    });
  } catch (err) {
    console.error("[Shop AI] Failed to persist ai_conversation_logs", err);
  }
}

/**
 * Shop AI: tools + step limit, then token logging. Matches UMA webhook behavior by
 * falling back to plain text if tool generation fails or returns no text (common when
 * the model stops after tool rounds without a final assistant message).
 */
export async function runShopAgentGenerate({
  supabase,
  shop,
  persona,
  messages,
  sessionId,
}: {
  supabase: SupabaseClient<Database>;
  shop: { id: string; name: string };
  persona: AiPersonaRow;
  messages: ModelMessage[];
  sessionId: string | undefined;
}) {
  const model = createGeminiModel();
  const systemPrompt = buildSystemPrompt(
    shop.name,
    persona.description_template,
    persona.system_prompt
  );
  const tools = buildAITools(supabase, shop);
  const temperature = persona.temperature ?? 0.7;

  const base = {
    model,
    system: systemPrompt,
    messages,
    temperature,
  };

  try {
    const withTools = await generateText({
      ...base,
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      onStepFinish: (event) => {
        console.log(`[Shop AI] [Step ${event.stepNumber}] Reason: ${event.finishReason}`);
        event.toolCalls.forEach((call) => {
          console.log(`[Shop AI]   Tool call: ${call.toolName}`, call.input);
        });
        event.toolResults.forEach((res) => {
          console.log(`[Shop AI]   Tool result (${res.toolName}):`, res.output);
        });
      },
    });

    if (!withTools.text?.trim()) {
      console.warn("[Shop AI] Empty text after tool run; retrying without tools", {
        shopId: shop.id,
        finishReason: withTools.finishReason,
        steps: withTools.steps.length,
      });
      const plain = await generateText(base);
      await finalizeGeneration(supabase, shop, persona, sessionId, plain);
      return plain;
    }

    await finalizeGeneration(supabase, shop, persona, sessionId, withTools);
    return withTools;
  } catch (toolErr) {
    console.error("[Shop AI] generateText with tools failed; retrying without tools", toolErr);
    const plain = await generateText(base);
    await finalizeGeneration(supabase, shop, persona, sessionId, plain);
    return plain;
  }
}
