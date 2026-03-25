import { streamText } from "ai";
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
    const supabase = supabaseTyped as any;

    const { data: shop } = await supabaseTyped
      .from("shops")
      .select("id, name")
      .eq("slug", shopSlug)
      .single();

    if (!shop) return new Response("Shop not found", { status: 404 });

    const { data: persona } = await supabase
      .from("ai_personas")
      .select("*")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .single();

    if (!persona) {
      return new Response("AI assistant not enabled for this shop", { status: 404 });
    }

    const model = createGeminiModel();
    const systemPrompt = buildSystemPrompt(shop.name, persona.description_template, persona.system_prompt);
    const tools = buildAITools(supabase, shop);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = streamText({
      model,
      system: systemPrompt,
      messages: messages as any,
      temperature: parseFloat(persona.temperature) || 0.7,
      maxSteps: 5,
      tools,
      onFinish: async ({ usage }: { usage?: { promptTokens?: number; completionTokens?: number } }) => {
        if (!sessionId) return;
        try {
          const svc = await createServiceClient();
          const svcAny = svc as any;
          const { data: existing } = await svcAny
            .from("ai_conversation_logs")
            .select("id, messages_count, tokens_input, tokens_output")
            .eq("shop_id", shop.id)
            .eq("session_id", sessionId)
            .single();

          if (existing) {
            await svcAny
              .from("ai_conversation_logs")
              .update({
                messages_count: existing.messages_count + 1,
                tokens_input: existing.tokens_input + (usage?.promptTokens ?? 0),
                tokens_output: existing.tokens_output + (usage?.completionTokens ?? 0),
              })
              .eq("id", existing.id);
          } else {
            await svcAny.from("ai_conversation_logs").insert({
              shop_id: shop.id,
              persona_id: persona.id,
              session_id: sessionId,
              messages_count: 1,
              tokens_input: usage?.promptTokens ?? 0,
              tokens_output: usage?.completionTokens ?? 0,
            });
          }
        } catch {
          // Non-critical
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error("[AI Chat] Error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
