-- Add index on feed_posts for aggregated feed performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_context_created
  ON public.feed_posts (context_type, context_id, created_at DESC)
  WHERE is_deleted = false;

-- Add index on follows for follower lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower_target
  ON public.follows (follower_id, target_type, target_id);