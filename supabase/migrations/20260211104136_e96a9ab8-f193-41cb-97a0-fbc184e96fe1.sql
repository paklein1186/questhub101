-- Fix entity-images storage policies: add folder-based ownership
DROP POLICY IF EXISTS "Authenticated users can update entity images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete entity images" ON storage.objects;

-- Only allow users to update files in their own folder
CREATE POLICY "Users can update own entity images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'entity-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Only allow users to delete files in their own folder
CREATE POLICY "Users can delete own entity images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'entity-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also fix the INSERT policy to enforce folder-based ownership
DROP POLICY IF EXISTS "Authenticated users can upload entity images" ON storage.objects;

CREATE POLICY "Users can upload own entity images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'entity-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix post-uploads INSERT to also enforce folder-based ownership
DROP POLICY IF EXISTS "Authenticated users can upload to post-uploads" ON storage.objects;

CREATE POLICY "Users can upload own post uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);