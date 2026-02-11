-- Extend decision_polls with full decision-making fields
ALTER TABLE public.decision_polls
  ADD COLUMN IF NOT EXISTS decision_type text NOT NULL DEFAULT 'POLL',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS quorum_type text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS quorum_value integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'GUILD_MEMBERS_ONLY',
  ADD COLUMN IF NOT EXISTS eligible_roles jsonb DEFAULT '["MEMBER","ADMIN"]'::jsonb,
  ADD COLUMN IF NOT EXISTS allow_comments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS outcome_summary text,
  ADD COLUMN IF NOT EXISTS opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS allow_vote_change boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pass_threshold integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS multi_select boolean NOT NULL DEFAULT false;

-- Extend decision_poll_votes with value and objection fields
ALTER TABLE public.decision_poll_votes
  ADD COLUMN IF NOT EXISTS value text,
  ADD COLUMN IF NOT EXISTS objection_reason text;

-- Index for fast guild decision lookups
CREATE INDEX IF NOT EXISTS idx_decision_polls_entity ON public.decision_polls(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_decision_poll_votes_poll ON public.decision_poll_votes(poll_id);