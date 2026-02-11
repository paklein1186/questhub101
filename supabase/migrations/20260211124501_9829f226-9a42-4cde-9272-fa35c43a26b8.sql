
-- Add universe_visibility to main entity tables
ALTER TABLE public.guilds ADD COLUMN IF NOT EXISTS universe_visibility text NOT NULL DEFAULT 'both';
ALTER TABLE public.pods ADD COLUMN IF NOT EXISTS universe_visibility text NOT NULL DEFAULT 'both';
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS universe_visibility text NOT NULL DEFAULT 'both';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS universe_visibility text NOT NULL DEFAULT 'both';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS universe_visibility text NOT NULL DEFAULT 'both';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS universe_visibility text NOT NULL DEFAULT 'both';
