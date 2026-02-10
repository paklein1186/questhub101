
-- Add owner_type and owner_id to services
ALTER TABLE public.services
  ADD COLUMN owner_type text NOT NULL DEFAULT 'USER',
  ADD COLUMN owner_id text;

-- Backfill existing services: set owner_id from provider_user_id
UPDATE public.services
SET owner_id = provider_user_id
WHERE provider_user_id IS NOT NULL AND owner_id IS NULL;

-- Backfill guild-owned services (where provider_guild_id is set but no user)
UPDATE public.services
SET owner_type = 'GUILD', owner_id = provider_guild_id
WHERE provider_guild_id IS NOT NULL AND provider_user_id IS NULL AND owner_id IS NULL;

-- Create index for fast lookups
CREATE INDEX idx_services_owner ON public.services(owner_type, owner_id);
