CREATE POLICY "Authenticated users can delete translations"
ON public.content_translations
FOR DELETE
TO authenticated
USING (true);