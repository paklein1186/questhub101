-- Only create storage policies that don't exist yet
DROP POLICY IF EXISTS "Users can update own entity images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own entity images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own post uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder in post-uploads" ON storage.objects;

CREATE POLICY "Users can update own entity images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'entity-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own entity images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'entity-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own post uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload to own folder in post-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);