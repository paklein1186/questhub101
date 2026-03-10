CREATE TABLE IF NOT EXISTS public.contribution_review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contribution_logs(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL,
  vote TEXT NOT NULL DEFAULT 'approve',
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contribution_id, reviewer_user_id)
);

ALTER TABLE public.contribution_review_votes ENABLE ROW LEVEL SECURITY;

-- Validation trigger for vote values
CREATE OR REPLACE FUNCTION public.validate_review_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.vote NOT IN ('approve', 'reject', 'dispute') THEN
    RAISE EXCEPTION 'Invalid vote: %. Must be one of: approve, reject, dispute', NEW.vote;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_review_vote ON public.contribution_review_votes;
CREATE TRIGGER trg_validate_review_vote
  BEFORE INSERT OR UPDATE ON public.contribution_review_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_review_vote();

-- RLS: authenticated users can read all votes
CREATE POLICY "Authenticated users can read review votes"
  ON public.contribution_review_votes
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS: users can insert their own votes
CREATE POLICY "Users can insert their own review votes"
  ON public.contribution_review_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_user_id = auth.uid());

-- RLS: users can update their own votes
CREATE POLICY "Users can update their own review votes"
  ON public.contribution_review_votes
  FOR UPDATE
  TO authenticated
  USING (reviewer_user_id = auth.uid())
  WITH CHECK (reviewer_user_id = auth.uid());