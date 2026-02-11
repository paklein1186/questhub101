
-- Fix: Add WITH CHECK to the UPDATE policy so authors can actually update their own comments
DROP POLICY "Authors can update own comments" ON public.comments;
CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Also add DELETE policy for completeness (comment_upvotes FK)
-- First ensure cascade on comment_upvotes FK
ALTER TABLE public.comment_upvotes
  DROP CONSTRAINT IF EXISTS comment_upvotes_comment_id_fkey;
ALTER TABLE public.comment_upvotes
  ADD CONSTRAINT comment_upvotes_comment_id_fkey
  FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;
