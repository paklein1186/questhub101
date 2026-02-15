-- Add visibility column to feed_posts for per-post access control
ALTER TABLE public.feed_posts 
ADD COLUMN visibility text NOT NULL DEFAULT 'public';

-- Add comment for documentation
COMMENT ON COLUMN public.feed_posts.visibility IS 'Post visibility: public, members, admins';
