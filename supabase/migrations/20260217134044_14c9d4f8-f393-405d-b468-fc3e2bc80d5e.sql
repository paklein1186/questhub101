-- Add image_url column to comments
ALTER TABLE public.comments ADD COLUMN image_url text;

-- Create storage bucket for comment images
INSERT INTO storage.buckets (id, name, public) VALUES ('comment-images', 'comment-images', true);

-- RLS policies for comment-images bucket
CREATE POLICY "Anyone can view comment images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comment-images');

CREATE POLICY "Authenticated users can upload comment images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'comment-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own comment images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'comment-images' AND auth.uid()::text = (storage.foldername(name))[1]);
