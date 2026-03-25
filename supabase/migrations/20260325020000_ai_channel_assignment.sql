-- ============================================================
-- AI Channel Assignment
-- Vendors can assign their AI persona to specific messaging
-- channels. Each conversation tracks whether the AI is still
-- handling it or a human vendor has taken over.
-- ============================================================

-- ai_enabled on a channel = AI auto-responds to all inbound messages in that channel
ALTER TABLE public.messaging_channels
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT false;

-- ai_active on a conversation:
--   true  = AI is handling (default for every new conversation)
--   false = vendor has taken over (AI stays silent)
ALTER TABLE public.messaging_conversations
  ADD COLUMN IF NOT EXISTS ai_active BOOLEAN NOT NULL DEFAULT true;
