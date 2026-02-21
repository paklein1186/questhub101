
-- Add feedpoint_default_* columns to territories (matching guilds/companies/profiles)
ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS feedpoint_default_services BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_quests BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_guilds BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_partner_entities BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedpoint_default_posts BOOLEAN NOT NULL DEFAULT false;
