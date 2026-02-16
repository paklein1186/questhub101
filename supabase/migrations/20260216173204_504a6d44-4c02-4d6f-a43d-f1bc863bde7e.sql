
-- Add attachment columns to direct_messages
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

-- Create dm-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm-attachments', 'dm-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for dm-attachments
CREATE POLICY "Authenticated users can upload dm attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dm-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view dm attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'dm-attachments');

CREATE POLICY "Users can delete their own dm attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'dm-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
