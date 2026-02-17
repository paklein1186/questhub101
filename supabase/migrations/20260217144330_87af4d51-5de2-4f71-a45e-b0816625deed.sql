
ALTER TABLE public.attachments ADD COLUMN title text;

CREATE POLICY "Uploaders can update their own attachments"
ON public.attachments FOR UPDATE TO authenticated
USING (auth.uid() = uploaded_by_user_id)
WITH CHECK (auth.uid() = uploaded_by_user_id);
