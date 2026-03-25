import { streamText, type ModelMessage } from "ai";
import { createServiceClient } from "@/lib/supabase/server";
import { buildSystemPrompt, createGeminiModel, buildAITools } from "@/lib/ai/chat-engine";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug } = await params;

  try {
    const body = await req.json();
    const { messages, sessionId } = body as {
      messages: { role: string; content: string }[];
      sessionId?: string;
    };

    const supabaseTyped = await createServiceClient();

    const { data: shop } = await supabaseTyped
      .from("shops")
      .select("id, name")
      .eq("slug", shopSlug)
      .single();

    if (!shop) return new Response("Shop not found", { status: 404 });

    const { data: persona } = await supabaseTyped
      .from("ai_personas")
      .select("*")
      .eq("shop_id", shop.id)
      .maybeSingle();

    if (!persona) {
      return new Response("AI assistant not configured for this shop", { status: 404 });
    }

    const model = createGeminiModel();
    const systemPrompt = buildSystemPrompt(shop.name, persona.description_template, persona.system_prompt);
    const tools = buildAITools(supabaseTyped, shop);

    const modelMessages: ModelMessage[] = (messages ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      temperature: persona.temperature ?? 0.7,
      tools,
      onFinish: async (event) => {
        if (!sessionId) return;
        try {
          const svc = await createServiceClient();
          const { data: existing } = await svc
            .from("ai_conversation_logs")
            .select("id, messages_count, tokens_input, tokens_output")
            .eq("shop_id", shop.id)
            .eq("session_id", sessionId)
            .single();

          const inputTokens = event.totalUsage.inputTokens ?? 0;
          const outputTokens = event.totalUsage.outputTokens ?? 0;

          if (existing) {
            await svc
              .from("ai_conversation_logs")
              .update({
                messages_count: existing.messages_count + 1,
                tokens_input: existing.tokens_input + inputTokens,
                tokens_output: existing.tokens_output + outputTokens,
              })
              .eq("id", existing.id);
          } else {
            await svc.from("ai_conversation_logs").insert({
              shop_id: shop.id,
              persona_id: persona.id,
              session_id: sessionId,
              messages_count: 1,
              tokens_input: inputTokens,
              tokens_output: outputTokens,
            });
          }
        } catch {
          // Non-critical
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("[AI Chat] Error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
