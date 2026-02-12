-- The SELECT policy "NOT is_deleted" blocks UPDATE operations that set is_deleted=true
-- because Postgres requires new rows to satisfy SELECT policies too.
-- Fix: allow authors to always see their own posts (including soft-deleted ones)

CREATE POLICY "Authors can see own posts"
ON public.feed_posts
FOR SELECT
TO authenticated
USING (auth.uid() = author_user_id);