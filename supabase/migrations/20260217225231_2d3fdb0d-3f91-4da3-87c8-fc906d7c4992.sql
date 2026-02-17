-- Add features_config to quests table (mirrors guilds pattern)
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS features_config jsonb NOT NULL DEFAULT '{}'::jsonb;