
DROP POLICY IF EXISTS "Authenticated users can upload comment images" ON storage.objects;
CREATE POLICY "Users upload comment images to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comment-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload dm attachments" ON storage.objects;
CREATE POLICY "Users upload dm attachments to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dm-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload quest attachments" ON storage.objects;
CREATE POLICY "Users upload quest attachments to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quest-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload territory chat files" ON storage.objects;
CREATE POLICY "Users upload territory chat files to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'territory-chat' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
CREATE POLICY "Users upload evidence to their folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contribution-evidence' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Service role insert territory logos" ON storage.objects;
CREATE POLICY "Admins insert territory logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'territory-logos' AND public.has_role(auth.uid(), 'admin'));
