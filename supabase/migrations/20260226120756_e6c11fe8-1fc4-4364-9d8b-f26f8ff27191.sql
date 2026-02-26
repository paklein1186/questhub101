
-- Add missing columns to eco_region_lookup
ALTER TABLE public.eco_region_lookup
  ADD COLUMN IF NOT EXISTS code_admin text,
  ADD COLUMN IF NOT EXISTS admin_level text,
  ADD COLUMN IF NOT EXISTS eco_region_scheme text DEFAULT 'WWF_ECOREGION',
  ADD COLUMN IF NOT EXISTS comments text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill code_admin and admin_level from existing data
UPDATE public.eco_region_lookup
SET code_admin = territory_code,
    admin_level = territory_granularity::text
WHERE code_admin IS NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_eco_region_lookup_admin
  ON public.eco_region_lookup (code_admin, admin_level);

-- Create mapping function
CREATE OR REPLACE FUNCTION public.map_territory_to_eco_region(
  p_territory_id uuid
)
RETURNS TABLE(
  eco_region_code text,
  eco_region_name text,
  eco_region_scheme text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_country_code text;
  v_nuts_code text;
  v_granularity text;
BEGIN
  -- Get territory info
  SELECT t.country_code, t.nuts_code, t.granularity::text
  INTO v_country_code, v_nuts_code, v_granularity
  FROM public.territories t
  WHERE t.id = p_territory_id AND t.is_deleted = false;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Try exact match on nuts_code first
  IF v_nuts_code IS NOT NULL THEN
    RETURN QUERY
      SELECT erl.eco_region_code, erl.eco_region_name, erl.eco_region_scheme
      FROM public.eco_region_lookup erl
      WHERE erl.code_admin = v_nuts_code
        AND erl.admin_level = v_granularity
      LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Fallback to country_code
  IF v_country_code IS NOT NULL THEN
    RETURN QUERY
      SELECT erl.eco_region_code, erl.eco_region_name, erl.eco_region_scheme
      FROM public.eco_region_lookup erl
      WHERE erl.code_admin = v_country_code
        AND erl.admin_level = 'COUNTRY'
      LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Nothing found → empty result (caller falls back to territorial matching)
  RETURN;
END;
$$;

-- Seed example data
INSERT INTO public.eco_region_lookup (territory_code, territory_granularity, code_admin, admin_level, eco_region_code, eco_region_name, eco_region_scheme)
VALUES
  ('FR', 'COUNTRY', 'FR', 'COUNTRY', 'EUROPE_TEMPERATE', 'European temperate forests', 'WWF_ECOREGION'),
  ('BE', 'COUNTRY', 'BE', 'COUNTRY', 'ATLANTIC_MIXED', 'Atlantic mixed forests', 'WWF_ECOREGION'),
  ('DE', 'COUNTRY', 'DE', 'COUNTRY', 'CENTRAL_EU_MIXED', 'Central European mixed forests', 'WWF_ECOREGION'),
  ('ES', 'COUNTRY', 'ES', 'COUNTRY', 'IBERIAN_SCLEROPHYLLOUS', 'Iberian sclerophyllous forests', 'WWF_ECOREGION'),
  ('IT', 'COUNTRY', 'IT', 'COUNTRY', 'MEDITERRANEAN_FORESTS', 'Mediterranean forests and woodlands', 'WWF_ECOREGION'),
  ('FR26', 'NUTS2', 'FR26', 'NUTS2', 'WEST_EU_BROADLEAF', 'Western European broadleaf forests', 'WWF_ECOREGION'),
  ('BE34', 'NUTS2', 'BE34', 'NUTS2', 'ARDENNES_MIXED', 'Ardennes mixed forests', 'WWF_ECOREGION'),
  ('FR10', 'NUTS2', 'FR10', 'NUTS2', 'PARIS_BASIN_TEMPERATE', 'Paris Basin temperate forests', 'WWF_ECOREGION'),
  ('DE30', 'NUTS2', 'DE30', 'NUTS2', 'BALTIC_MIXED', 'Baltic mixed forests', 'WWF_ECOREGION'),
  ('ES51', 'NUTS2', 'ES51', 'NUTS2', 'NE_SPAIN_MEDITERRANEAN', 'Northeastern Spain Mediterranean forests', 'WWF_ECOREGION')
ON CONFLICT DO NOTHING;
