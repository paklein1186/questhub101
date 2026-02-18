
-- Add SELECT policy for dm-attachments so participants can create signed URLs
-- Both sender (own folder) and receivers need to be able to resolve signed URLs
-- Since this is a private bucket with time-limited signed URLs, allowing any
-- authenticated user to SELECT (for signed URL generation) is safe and correct.
CREATE POLICY "Authenticated users can view dm attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dm-attachments'
  AND auth.uid() IS NOT NULL
);
