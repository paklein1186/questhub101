
-- Exit enums
DO $$ BEGIN
  CREATE TYPE public.exit_type AS ENUM ('voluntary','graceful_withdrawal','involuntary_cause','involuntary_no_cause','abandonment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.leaver_class AS ENUM ('good','graceful','bad');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Guild exit columns
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS exit_bad_leaver_decision TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS exit_good_leaver_fmv_pct INTEGER NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS exit_graceful_fmv_pct INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS exit_bad_leaver_fmv_pct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abandonment_threshold_days INTEGER NOT NULL DEFAULT 60;

-- Contributor exits table
CREATE TABLE IF NOT EXISTS public.contributor_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exit_type public.exit_type NOT NULL,
  leaver_class public.leaver_class NOT NULL,
  exit_initiated_by UUID,
  fmv_at_exit NUMERIC(12,2) NOT NULL DEFAULT 0,
  pct_at_exit NUMERIC(6,4) NOT NULL DEFAULT 0,
  settlement_pct INTEGER NOT NULL DEFAULT 0,
  settlement_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  settlement_status TEXT NOT NULL DEFAULT 'pending',
  handover_committed BOOLEAN NOT NULL DEFAULT FALSE,
  handover_note TEXT,
  redistribution_snapshot JSONB,
  exit_note TEXT,
  last_contribution_at TIMESTAMPTZ,
  re_entry_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  exited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contributor_exits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exits" ON public.contributor_exits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert exits" ON public.contributor_exits
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update exits" ON public.contributor_exits
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Exit votes table
CREATE TABLE IF NOT EXISTS public.exit_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_id UUID NOT NULL REFERENCES public.contributor_exits(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL,
  vote TEXT NOT NULL,
  note TEXT,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exit_id, voter_user_id)
);

ALTER TABLE public.exit_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exit_votes" ON public.exit_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert exit_votes" ON public.exit_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = voter_user_id);

-- Re-entry link on contribution_logs
ALTER TABLE public.contribution_logs
  ADD COLUMN IF NOT EXISTS re_entry_exit_id UUID REFERENCES public.contributor_exits(id);

-- Validation trigger for settlement_status
CREATE OR REPLACE FUNCTION public.validate_contributor_exit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.settlement_status NOT IN ('pending', 'paid', 'waived') THEN
    RAISE EXCEPTION 'Invalid settlement_status: %', NEW.settlement_status;
  END IF;
  IF NEW.settlement_pct < 0 OR NEW.settlement_pct > 100 THEN
    RAISE EXCEPTION 'settlement_pct must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_contributor_exit_trigger ON public.contributor_exits;
CREATE TRIGGER validate_contributor_exit_trigger
  BEFORE INSERT OR UPDATE ON public.contributor_exits
  FOR EACH ROW EXECUTE FUNCTION public.validate_contributor_exit();
