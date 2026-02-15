-- Add reshare support to feed_posts
ALTER TABLE public.feed_posts
ADD COLUMN reshared_post_id uuid REFERENCES public.feed_posts(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX idx_feed_posts_reshared ON public.feed_posts(reshared_post_id) WHERE reshared_post_id IS NOT NULL;

-- Count reshares for a post
COMMENT ON COLUMN public.feed_posts.reshared_post_id IS 'References the original post being reshared/quoted. NULL for original posts.';
