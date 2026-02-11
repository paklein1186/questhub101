
-- Add upvote_count to feed_posts
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0;

-- Create post_upvotes table
CREATE TABLE public.post_upvotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.post_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post upvotes"
  ON public.post_upvotes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own upvotes"
  ON public.post_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upvotes"
  ON public.post_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to maintain denormalized upvote_count on feed_posts
CREATE OR REPLACE FUNCTION public.update_post_upvotes_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feed_posts SET upvote_count = upvote_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feed_posts SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_post_upvotes_count
  AFTER INSERT OR DELETE ON public.post_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_upvotes_count();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_upvotes_post_id ON public.post_upvotes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_upvotes_user_post ON public.post_upvotes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_upvote_count ON public.feed_posts(upvote_count DESC);
