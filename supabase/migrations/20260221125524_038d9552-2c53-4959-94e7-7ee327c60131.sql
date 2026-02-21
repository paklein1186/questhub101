
-- 1. Add feedpoint default visibility columns to website owner tables

-- Profiles (user website owners)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feedpoint_default_services boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_quests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_guilds boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_partner_entities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_posts boolean NOT NULL DEFAULT false;

-- Guilds (guild website owners)
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS feedpoint_default_services boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_quests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_guilds boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_partner_entities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_posts boolean NOT NULL DEFAULT false;

-- Companies (partner entity / organization website owners)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS feedpoint_default_services boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_quests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_guilds boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_partner_entities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_posts boolean NOT NULL DEFAULT false;

-- 2. Add web_visibility_override to unit tables

-- Services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS web_visibility_override text NOT NULL DEFAULT 'inherit';

-- Quests
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS web_visibility_override text NOT NULL DEFAULT 'inherit';

-- Guilds (as a unit displayed on other contexts)
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS web_visibility_override text NOT NULL DEFAULT 'inherit';

-- Companies (as a unit displayed on other contexts)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS web_visibility_override text NOT NULL DEFAULT 'inherit';

-- Feed posts
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS web_visibility_override text NOT NULL DEFAULT 'inherit';
