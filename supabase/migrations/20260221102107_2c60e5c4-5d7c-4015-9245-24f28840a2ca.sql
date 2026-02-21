
-- ═══════════════════════════════════════════════════════════════
-- 1) site_codes table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE public.site_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'guild', 'territory', 'program')),
  owner_id UUID NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id)
);

ALTER TABLE public.site_codes ENABLE ROW LEVEL SECURITY;

-- Owner can read their own site code
CREATE POLICY "Users can view own site codes"
  ON public.site_codes FOR SELECT
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR (owner_type = 'guild' AND owner_id IN (
      SELECT guild_id FROM guild_members WHERE user_id = auth.uid() AND role = 'ADMIN'
    ))
    OR (owner_type = 'territory' AND EXISTS (
      SELECT 1 FROM user_territories WHERE user_id = auth.uid() AND territory_id = owner_id
    ))
    OR public.has_role(auth.uid(), 'admin')
  );

-- Owner can insert their own site code
CREATE POLICY "Users can create own site codes"
  ON public.site_codes FOR INSERT
  WITH CHECK (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR (owner_type = 'guild' AND owner_id IN (
      SELECT guild_id FROM guild_members WHERE user_id = auth.uid() AND role = 'ADMIN'
    ))
    OR public.has_role(auth.uid(), 'admin')
  );

-- Owner can update (revoke) their own site code
CREATE POLICY "Users can update own site codes"
  ON public.site_codes FOR UPDATE
  USING (
    (owner_type = 'user' AND owner_id = auth.uid())
    OR (owner_type = 'guild' AND owner_id IN (
      SELECT guild_id FROM guild_members WHERE user_id = auth.uid() AND role = 'ADMIN'
    ))
    OR public.has_role(auth.uid(), 'admin')
  );

-- Public read for non-revoked codes (needed by the site-feed endpoint)
CREATE POLICY "Anyone can read non-revoked site codes"
  ON public.site_codes FOR SELECT
  USING (revoked = false);

CREATE TRIGGER update_site_codes_updated_at
  BEFORE UPDATE ON public.site_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 2) Add web visibility columns to profiles
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS web_scopes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS web_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_order INTEGER;

-- ═══════════════════════════════════════════════════════════════
-- 3) Add web visibility columns to territories
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS public_visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS web_scopes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS web_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_order INTEGER;
