
INSERT INTO storage.buckets (id, name, public) VALUES ('quest-attachments', 'quest-attachments', true);

CREATE POLICY "Authenticated users can upload quest attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quest-attachments');

CREATE POLICY "Anyone can view quest attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'quest-attachments');

CREATE POLICY "Users can delete their own quest attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'quest-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
