
-- Add geojson column to territories for boundary shapes
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS geojson jsonb;
