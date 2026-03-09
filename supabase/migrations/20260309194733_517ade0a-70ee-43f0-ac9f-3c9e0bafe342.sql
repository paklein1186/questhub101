
-- Add logo_url column to territories
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for territory logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('territory-logos', 'territory-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read territory logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'territory-logos');

-- Allow service role to insert
CREATE POLICY "Service role insert territory logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'territory-logos');
