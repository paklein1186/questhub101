
-- Allow authors to delete their own comments
CREATE POLICY "Authors can delete own comments"
  ON public.comments
  FOR DELETE
  USING (auth.uid() = author_id);

-- Allow admins/superadmins to delete any comment
CREATE POLICY "Admins can delete any comment"
  ON public.comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );
