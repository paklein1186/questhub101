-- Add upvote_count to quest_updates
ALTER TABLE public.quest_updates ADD COLUMN IF NOT EXISTS upvote_count integer NOT NULL DEFAULT 0;

-- Create upvotes junction table
CREATE TABLE public.quest_update_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.quest_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(update_id, user_id)
);

ALTER TABLE public.quest_update_upvotes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read upvotes
CREATE POLICY "Anyone can view update upvotes"
  ON public.quest_update_upvotes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own upvotes
CREATE POLICY "Users can upvote updates"
  ON public.quest_update_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own upvotes
CREATE POLICY "Users can remove own upvotes"
  ON public.quest_update_upvotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to keep upvote_count in sync
CREATE OR REPLACE FUNCTION public.update_quest_update_upvote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE quest_updates SET upvote_count = upvote_count + 1 WHERE id = NEW.update_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE quest_updates SET upvote_count = GREATEST(0, upvote_count - 1) WHERE id = OLD.update_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_quest_update_upvote_count
  AFTER INSERT OR DELETE ON public.quest_update_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_quest_update_upvote_count();