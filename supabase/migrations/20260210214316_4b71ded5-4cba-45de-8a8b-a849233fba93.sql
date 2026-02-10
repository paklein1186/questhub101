
-- Add parent_id and slug to territories
ALTER TABLE public.territories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs from name for existing territories
UPDATE public.territories SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;

-- Add unique constraint on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_territories_slug ON public.territories(slug) WHERE slug IS NOT NULL AND is_deleted = false;

-- Add attachment_type and is_primary to user_territories
ALTER TABLE public.user_territories
ADD COLUMN IF NOT EXISTS attachment_type TEXT NOT NULL DEFAULT 'LIVE_IN',
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Add relation_type and is_primary to entity territory tables
ALTER TABLE public.quest_territories
ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'LOCATED_IN',
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.guild_territories
ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'LOCATED_IN',
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.service_territories
ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'LOCATED_IN',
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.course_territories
ADD COLUMN IF NOT EXISTS relation_type TEXT NOT NULL DEFAULT 'LOCATED_IN',
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Create missing junction tables
CREATE TABLE IF NOT EXISTS public.pod_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'LOCATED_IN',
  is_primary BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.pod_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pod territories" ON public.pod_territories FOR SELECT USING (true);
CREATE POLICY "Pod creators can manage pod territories" ON public.pod_territories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pods WHERE id = pod_id AND creator_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.company_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'LOCATED_IN',
  is_primary BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.company_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view company territories" ON public.company_territories FOR SELECT USING (true);
CREATE POLICY "Company admins can manage company territories" ON public.company_territories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.company_members WHERE company_id = company_territories.company_id AND user_id = auth.uid() AND role = 'ADMIN')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_territories_attachment ON public.user_territories(user_id, attachment_type);
CREATE INDEX IF NOT EXISTS idx_pod_territories_pod ON public.pod_territories(pod_id);
CREATE INDEX IF NOT EXISTS idx_company_territories_company ON public.company_territories(company_id);
CREATE INDEX IF NOT EXISTS idx_territories_parent ON public.territories(parent_id);
