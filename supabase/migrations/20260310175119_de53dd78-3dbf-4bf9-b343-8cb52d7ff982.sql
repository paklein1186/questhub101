DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE public.difficulty_level AS ENUM ('standard','x1_5','x2','x3');
  END IF;
END $$;

ALTER TABLE public.contribution_logs
  ADD COLUMN IF NOT EXISTS difficulty public.difficulty_level NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS fmv_value NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS half_days NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS review_quorum INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS review_votes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_compensated NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compensation_status TEXT NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.validate_compensation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.compensation_status NOT IN ('pending', 'partial', 'compensated') THEN
    RAISE EXCEPTION 'Invalid compensation_status: %. Must be one of: pending, partial, compensated', NEW.compensation_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_compensation_status ON public.contribution_logs;
CREATE TRIGGER trg_validate_compensation_status
  BEFORE INSERT OR UPDATE ON public.contribution_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_compensation_status();