
-- Add quest_type column to quests table
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS quest_type text NOT NULL DEFAULT 'ACTION';

-- Update any existing null values (safety)
UPDATE public.quests SET quest_type = 'ACTION' WHERE quest_type IS NULL;
