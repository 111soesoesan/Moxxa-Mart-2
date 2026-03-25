-- ============================================================
-- AI Persona Channel Routing Cleanup
-- Channel assignment now controls where the assistant responds.
-- Keep existing personas available by default instead of gating
-- them behind a separate active flag.
-- ============================================================

ALTER TABLE public.ai_personas
  ALTER COLUMN is_active SET DEFAULT TRUE;

UPDATE public.ai_personas
SET is_active = TRUE
WHERE is_active = FALSE;

DROP POLICY IF EXISTS "ai_personas_public_read" ON public.ai_personas;

CREATE POLICY "ai_personas_public_read"
  ON public.ai_personas FOR SELECT
  USING (TRUE);
