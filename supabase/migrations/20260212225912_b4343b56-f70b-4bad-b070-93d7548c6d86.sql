-- Drop existing update policy
DROP POLICY IF EXISTS "Authors can update own posts" ON public.feed_posts;

-- Recreate with explicit WITH CHECK that allows setting is_deleted = true
CREATE POLICY "Authors can update own posts"
ON public.feed_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = author_user_id)
WITH CHECK (auth.uid() = author_user_id);