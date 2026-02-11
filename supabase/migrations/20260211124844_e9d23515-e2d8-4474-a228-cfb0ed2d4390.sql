
-- Drop the overly permissive INSERT policy
DROP POLICY "Authenticated users can insert mentions" ON public.comment_mentions;

-- Only allow inserting mentions for comments the current user authored
CREATE POLICY "Authors can insert mentions on their comments"
  ON public.comment_mentions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comments
      WHERE comments.id = comment_id
        AND comments.author_id = auth.uid()
    )
  );
