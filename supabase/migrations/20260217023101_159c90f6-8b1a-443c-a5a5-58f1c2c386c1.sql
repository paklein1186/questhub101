
-- Create storage bucket for broadcast attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('broadcast-attachments', 'broadcast-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload
CREATE POLICY "Admins can upload broadcast attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'broadcast-attachments'
  AND public.has_role(auth.uid(), 'admin')
);

-- Public read access for broadcast attachments
CREATE POLICY "Broadcast attachments are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'broadcast-attachments');

-- Admins can delete broadcast attachments
CREATE POLICY "Admins can delete broadcast attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'broadcast-attachments'
  AND public.has_role(auth.uid(), 'admin')
);
