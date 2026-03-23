-- ============================================================
-- UNIFIED MESSAGING ADAPTER (UMA) — MESSAGING SYSTEM
-- Creates messaging_channels, messaging_conversations, and
-- messaging_messages tables with shop-level RLS isolation.
-- ============================================================


-- ─── 1. messaging_channels ────────────────────────────────────
-- Stores per-shop platform configurations (one row per shop per platform).
CREATE TABLE IF NOT EXISTS public.messaging_channels (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  platform    TEXT        NOT NULL
                CHECK (platform IN ('telegram', 'viber', 'webchat')),
  is_active   BOOLEAN     NOT NULL DEFAULT FALSE,
  config      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_id, platform)
);

CREATE INDEX IF NOT EXISTS messaging_channels_shop_id_idx
  ON public.messaging_channels(shop_id);


-- ─── 2. messaging_conversations ───────────────────────────────
-- One row per logical conversation thread, scoped to a shop + channel.
CREATE TABLE IF NOT EXISTS public.messaging_conversations (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                 UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  channel_id              UUID        REFERENCES public.messaging_channels(id) ON DELETE SET NULL,
  customer_id             UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  platform                TEXT        NOT NULL
                            CHECK (platform IN ('telegram', 'viber', 'webchat')),
  platform_conversation_id TEXT,
  customer_name           TEXT,
  customer_avatar         TEXT,
  last_message_at         TIMESTAMPTZ,
  last_message_preview    TEXT,
  unread_count            INTEGER     NOT NULL DEFAULT 0,
  status                  TEXT        NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'resolved', 'archived')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, platform_conversation_id)
);

CREATE INDEX IF NOT EXISTS messaging_conversations_shop_id_idx
  ON public.messaging_conversations(shop_id);

CREATE INDEX IF NOT EXISTS messaging_conversations_channel_id_idx
  ON public.messaging_conversations(channel_id);

CREATE INDEX IF NOT EXISTS messaging_conversations_last_message_at_idx
  ON public.messaging_conversations(last_message_at DESC NULLS LAST);


-- ─── 3. messaging_messages ────────────────────────────────────
-- Individual messages within a conversation.
CREATE TABLE IF NOT EXISTS public.messaging_messages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID        NOT NULL REFERENCES public.messaging_conversations(id) ON DELETE CASCADE,
  direction           TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_id           TEXT,
  sender_name         TEXT,
  content             TEXT        NOT NULL,
  content_type        TEXT        NOT NULL DEFAULT 'text'
                        CHECK (content_type IN ('text', 'image', 'file', 'sticker')),
  platform_message_id TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messaging_messages_conversation_id_idx
  ON public.messaging_messages(conversation_id);

CREATE INDEX IF NOT EXISTS messaging_messages_created_at_idx
  ON public.messaging_messages(created_at DESC);


-- ─── 4. Auto-update conversation on new message ───────────────
CREATE OR REPLACE FUNCTION public.update_conversation_on_message_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.messaging_conversations
  SET
    last_message_at      = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 120),
    unread_count         = CASE
                             WHEN NEW.direction = 'inbound' THEN unread_count + 1
                             ELSE unread_count
                           END,
    updated_at           = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_on_message_insert
  AFTER INSERT ON public.messaging_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message_insert();


-- ─── 5. RLS — messaging_channels ──────────────────────────────
ALTER TABLE public.messaging_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_manage_own_messaging_channels"
  ON public.messaging_channels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = messaging_channels.shop_id
        AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "service_role_full_access_messaging_channels"
  ON public.messaging_channels FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 6. RLS — messaging_conversations ─────────────────────────
ALTER TABLE public.messaging_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_manage_own_conversations"
  ON public.messaging_conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = messaging_conversations.shop_id
        AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "service_role_full_access_conversations"
  ON public.messaging_conversations FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 7. RLS — messaging_messages ──────────────────────────────
ALTER TABLE public.messaging_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_manage_own_messages"
  ON public.messaging_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.messaging_conversations conv
      JOIN public.shops s ON s.id = conv.shop_id
      WHERE conv.id = messaging_messages.conversation_id
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "service_role_full_access_messages"
  ON public.messaging_messages FOR ALL
  USING (auth.role() = 'service_role');


-- ─── 8. Enable Realtime for live inbox updates ─────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaging_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messaging_messages;
