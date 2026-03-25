-- ============================================================
-- AI PERSONA ENGINE
-- Enables vendors to configure customized AI assistants for
-- their storefront. Also tracks usage per session.
-- ============================================================

-- ─── 1. AI Personas ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_personas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id              UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL DEFAULT 'Aria',
  description_template TEXT NOT NULL DEFAULT 'professional'
                         CHECK (description_template IN ('professional','friendly','streetwear','tech','luxury')),
  system_prompt        TEXT NOT NULL DEFAULT '',
  greeting_message     TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
  temperature          NUMERIC(3,2) NOT NULL DEFAULT 0.70
                         CHECK (temperature >= 0 AND temperature <= 2),
  top_p                NUMERIC(3,2) NOT NULL DEFAULT 1.00
                         CHECK (top_p >= 0 AND top_p <= 1),
  is_active            BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id)
);

-- ─── 2. AI Conversation logs (usage tracking) ────────────────
CREATE TABLE IF NOT EXISTS public.ai_conversation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES public.ai_personas(id) ON DELETE SET NULL,
  session_id      TEXT NOT NULL,
  messages_count  INT NOT NULL DEFAULT 0,
  tokens_input    INT NOT NULL DEFAULT 0,
  tokens_output   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. updated_at trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_ai_persona_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_personas_touch_updated_at ON public.ai_personas;
CREATE TRIGGER ai_personas_touch_updated_at
  BEFORE UPDATE ON public.ai_personas
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_persona_updated_at();

DROP TRIGGER IF EXISTS ai_conversation_logs_touch_updated_at ON public.ai_conversation_logs;
CREATE TRIGGER ai_conversation_logs_touch_updated_at
  BEFORE UPDATE ON public.ai_conversation_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_ai_persona_updated_at();

-- ─── 4. RLS ──────────────────────────────────────────────────
ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_logs ENABLE ROW LEVEL SECURITY;

-- Vendors can manage their own persona
CREATE POLICY "ai_personas_vendor_all" ON public.ai_personas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = ai_personas.shop_id
        AND shops.owner_id = auth.uid()
    )
  );

-- Anyone can read active personas (needed for chat API route using service key)
CREATE POLICY "ai_personas_public_read" ON public.ai_personas
  FOR SELECT
  USING (is_active = true);

-- Vendors can read their own conversation logs
CREATE POLICY "ai_logs_vendor_select" ON public.ai_conversation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = ai_conversation_logs.shop_id
        AND shops.owner_id = auth.uid()
    )
  );

-- Service role can insert logs (chat API uses service key)
-- (service role bypasses RLS by default)
