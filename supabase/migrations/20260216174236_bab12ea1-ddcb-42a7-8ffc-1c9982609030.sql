
-- Add sender_label to conversations (e.g. "Guild: Trois-Tiers" or "changethegame Platform")
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS sender_label TEXT,
  ADD COLUMN IF NOT EXISTS sender_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS sender_entity_id TEXT;

-- Add sender_label to direct_messages so each message can carry the branding
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS sender_label TEXT;
