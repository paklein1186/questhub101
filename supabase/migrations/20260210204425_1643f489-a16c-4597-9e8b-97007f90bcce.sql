
-- Create a public storage bucket for entity images
INSERT INTO storage.buckets (id, name, public) VALUES ('entity-images', 'entity-images', true);

-- Allow anyone to view images
CREATE POLICY "Entity images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'entity-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload entity images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'entity-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update entity images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'entity-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete entity images"
ON storage.objects FOR DELETE
USING (bucket_id = 'entity-images' AND auth.role() = 'authenticated');
