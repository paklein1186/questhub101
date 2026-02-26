
-- 1. Enums for territorial precision and granularity
CREATE TYPE territorial_precision_level AS ENUM (
  'STRICT_MATCH',
  'PERIMETER_MATCH',
  'BIOREGIONAL_MATCH'
);

CREATE TYPE territorial_granularity AS ENUM (
  'COUNTRY',
  'NUTS1',
  'NUTS2',
  'NUTS3',
  'DISTRICT_OR_COMMUNE',
  'CUSTOM_PERIMETER'
);

CREATE TYPE dataset_granularity AS ENUM (
  'GLOBAL',
  'COUNTRY',
  'NUTS1',
  'NUTS2',
  'NUTS3',
  'BIOREGION',
  'CUSTOM'
);

CREATE TYPE dataset_fetch_method AS ENUM (
  'API',
  'SCRAPER',
  'STATIC_IMPORT'
);

-- 2. Add new columns to territories
ALTER TABLE territories
  ADD COLUMN IF NOT EXISTS precision_level territorial_precision_level NOT NULL DEFAULT 'PERIMETER_MATCH',
  ADD COLUMN IF NOT EXISTS granularity territorial_granularity DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_expand_perimeter boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_perimeter_name text DEFAULT NULL;

-- 3. Add external_data_links to natural_systems
ALTER TABLE natural_systems
  ADD COLUMN IF NOT EXISTS external_data_links jsonb DEFAULT '[]'::jsonb;

-- 4. Environmental Datasets table
CREATE TABLE public.environmental_datasets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  source text NOT NULL,
  granularity dataset_granularity NOT NULL DEFAULT 'GLOBAL',
  fetch_method dataset_fetch_method NOT NULL DEFAULT 'STATIC_IMPORT',
  metadata_schema jsonb DEFAULT '{}'::jsonb,
  update_frequency text DEFAULT 'manual',
  is_active boolean NOT NULL DEFAULT true,
  description text DEFAULT NULL,
  api_endpoint text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.environmental_datasets ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read datasets
CREATE POLICY "Anyone can read environmental datasets"
  ON public.environmental_datasets
  FOR SELECT
  USING (true);

-- 5. Eco Region Lookup table (WWF ecoregions mapping)
CREATE TABLE public.eco_region_lookup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_granularity territorial_granularity NOT NULL,
  territory_code text NOT NULL,
  eco_region_code text NOT NULL,
  eco_region_name text NOT NULL,
  biome text DEFAULT NULL,
  realm text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.eco_region_lookup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read eco region lookup"
  ON public.eco_region_lookup
  FOR SELECT
  USING (true);

CREATE INDEX idx_eco_region_territory ON public.eco_region_lookup(territory_granularity, territory_code);

-- 6. Territory-Dataset matches (cached results of matching)
CREATE TABLE public.territory_dataset_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  dataset_id uuid NOT NULL REFERENCES public.environmental_datasets(id) ON DELETE CASCADE,
  match_level text NOT NULL DEFAULT 'STRICT_MATCH',
  matched_granularity text NOT NULL,
  last_fetched_at timestamptz DEFAULT NULL,
  fetched_summary jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(territory_id, dataset_id)
);

ALTER TABLE public.territory_dataset_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read territory dataset matches"
  ON public.territory_dataset_matches
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage territory dataset matches"
  ON public.territory_dataset_matches
  FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_territory_dataset_territory ON public.territory_dataset_matches(territory_id);
