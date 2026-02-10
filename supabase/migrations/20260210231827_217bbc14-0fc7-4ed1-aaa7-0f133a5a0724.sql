-- Add ownership fields to quests
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS owner_type text NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS owner_id text;

-- Backfill existing quests: owner is the creator
UPDATE public.quests SET owner_id = created_by_user_id WHERE owner_id IS NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_quests_owner ON public.quests (owner_type, owner_id);