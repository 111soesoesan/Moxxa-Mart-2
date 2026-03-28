/**
 * Server-side AI observability. Uses console.error so lines show up reliably in
 * Next/Turbopack terminals (some setups buffer or hide console.info).
 *
 * Set WEBCHAT_AI_DIAGNOSTICS=1 to include `ai_diagnostics` on /api/webchat JSON responses
 * (for debugging only — do not enable in production unless you accept response size/leak risk).
 */

export type AiTraceEvent = {
  source: "webchat" | "shop_ai";
  runId: string;
  stage: string;
  at: string;
  durationMs?: number;
  [key: string]: unknown;
};

export function webchatAiDiagnosticsInResponse(): boolean {
  return process.env.WEBCHAT_AI_DIAGNOSTICS === "1";
}

/** Serialize errors from AI SDK / Gemini / fetch (rate limits, invalid key, etc.) */
export function serializeAiError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const msg = err.message;
    const lower = msg.toLowerCase();
    const looksLikeRateLimit =
      /429|rate limit|resource_exhausted|quota|too many requests|resource has been exhausted/i.test(
        msg
      );
    const looksLikeAuth =
      /401|403|api key|invalid.*key|permission denied|unauthenticated/i.test(lower);
    return {
      name: err.name,
      message: msg,
      looksLikeRateLimit,
      looksLikeAuth,
      stack: err.stack?.slice(0, 800),
      cause:
        err.cause instanceof Error
          ? { name: err.cause.name, message: err.cause.message }
          : err.cause != null
            ? String(err.cause)
            : undefined,
    };
  }
  if (typeof err === "object" && err !== null) {
    try {
      return { raw: JSON.stringify(err).slice(0, 500) };
    } catch {
      return { raw: String(err) };
    }
  }
  return { message: String(err) };
}

/**
 * One tracer per HTTP request. Stages prefixed `shop_agent_` are tagged source `shop_ai`;
 * all others are `webchat` (works for any caller that uses those prefixes).
 */
export function createRequestAiTracer(runId: string) {
  const events: AiTraceEvent[] = [];

  function trace(stage: string, extra?: Record<string, unknown>, startedAt?: number) {
    const source: AiTraceEvent["source"] = stage.startsWith("shop_agent")
      ? "shop_ai"
      : "webchat";
    const at = new Date().toISOString();
    const e: AiTraceEvent = {
      source,
      runId,
      stage,
      at,
      ...extra,
      ...(startedAt != null ? { durationMs: Date.now() - startedAt } : {}),
    };
    events.push(e);
    console.error(`[AI_TRACE] ${JSON.stringify(e)}`);
    return Date.now();
  }

  return { trace, events };
}

export type EmitAiTrace = (stage: string, extra?: Record<string, unknown>, startedAt?: number) => number;
