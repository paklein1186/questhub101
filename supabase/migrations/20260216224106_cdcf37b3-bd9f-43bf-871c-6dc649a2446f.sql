
-- Add org_type column to companies for organization classification
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'other';
-- Add is_verified column for verified organization badge
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
-- Add mission_statement for AI-scraped mission
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS mission_statement text;
-- Add collaboration_interests for what they're looking for
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS collaboration_interests text[];
-- Add scale_category for estimated org scale
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS scale_category text;

-- Comment for documentation
COMMENT ON COLUMN public.companies.org_type IS 'Organization type: public_sector, corporation, academic, foundation, ngo, cooperative, other';
COMMENT ON COLUMN public.companies.is_verified IS 'Whether the organization has been verified by platform admins';
COMMENT ON COLUMN public.companies.mission_statement IS 'AI-extracted or user-provided mission statement';
COMMENT ON COLUMN public.companies.collaboration_interests IS 'Array of collaboration interest areas';
COMMENT ON COLUMN public.companies.scale_category IS 'Estimated scale: small, medium, large';
