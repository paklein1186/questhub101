
-- Step 1: Create enum for dataset_type
DO $$ BEGIN
  CREATE TYPE public.dataset_type AS ENUM ('FOREST_NAVIGATOR', 'COPERNICUS', 'GBIF', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.api_method AS ENUM ('GET', 'POST', 'STATIC_FILE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add columns to environmental_datasets
ALTER TABLE public.environmental_datasets
  ADD COLUMN IF NOT EXISTS dataset_type text DEFAULT 'CUSTOM',
  ADD COLUMN IF NOT EXISTS api_base_url text,
  ADD COLUMN IF NOT EXISTS api_method text DEFAULT 'GET',
  ADD COLUMN IF NOT EXISTS api_params_template jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS response_mapping jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS example_response jsonb;
