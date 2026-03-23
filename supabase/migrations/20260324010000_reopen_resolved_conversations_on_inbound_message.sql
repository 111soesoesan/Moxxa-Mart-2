-- ============================================================
-- Reopen resolved conversations on new inbound messages
-- ============================================================
-- When a customer sends a new inbound message after the
-- conversation has been marked as `resolved`, automatically
-- set the conversation back to `open` for all messaging channels.

CREATE OR REPLACE FUNCTION public.update_conversation_on_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE public.messaging_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 120),
    unread_count =
      CASE
        WHEN NEW.direction = 'inbound' THEN unread_count + 1
        ELSE unread_count
      END,
    status =
      CASE
        WHEN NEW.direction = 'inbound' AND status = 'resolved' THEN 'open'
        ELSE status
      END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

