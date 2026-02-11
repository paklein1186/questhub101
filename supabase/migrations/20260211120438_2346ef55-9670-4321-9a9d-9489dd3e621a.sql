
-- Add visibility, pinned, and comments_enabled columns to quest_updates
ALTER TABLE public.quest_updates
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS comments_enabled boolean NOT NULL DEFAULT true;

-- Add index for pinned updates
CREATE INDEX IF NOT EXISTS idx_quest_updates_pinned ON public.quest_updates (quest_id, pinned DESC, created_at DESC);
