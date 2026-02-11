
-- Create comment_mentions table
CREATE TABLE public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_comment_mentions_user ON public.comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_comment ON public.comment_mentions(comment_id);

-- Enable RLS
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read mentions
CREATE POLICY "Authenticated users can read mentions"
  ON public.comment_mentions FOR SELECT TO authenticated
  USING (true);

-- Comment author can insert mentions (via app logic)
CREATE POLICY "Authenticated users can insert mentions"
  ON public.comment_mentions FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add notify_mentions column to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notify_mentions boolean NOT NULL DEFAULT true;
