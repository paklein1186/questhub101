-- Add attachment columns to territory_chat_logs
ALTER TABLE public.territory_chat_logs
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT;

-- Create storage bucket for territory chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('territory-chat', 'territory-chat', true, 26214400)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload territory chat files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'territory-chat' AND auth.role() = 'authenticated');

-- Anyone can view territory chat files (public bucket)
CREATE POLICY "Anyone can view territory chat files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'territory-chat');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own territory chat files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'territory-chat' AND auth.uid()::text = (storage.foldername(name))[1]);
