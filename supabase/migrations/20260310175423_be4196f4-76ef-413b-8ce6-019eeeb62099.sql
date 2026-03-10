CREATE TABLE IF NOT EXISTS public.contribution_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.contribution_logs(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.quests(id),
  user_id UUID NOT NULL,
  amount_coins NUMERIC(12,2) NOT NULL,
  amount_fiat NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  compensation_mode TEXT NOT NULL DEFAULT 'coins',
  note TEXT,
  compensated_by UUID,
  compensated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contribution_compensations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_compensation_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.compensation_mode NOT IN ('coins', 'fiat', 'mixed') THEN
    RAISE EXCEPTION 'Invalid compensation_mode: %. Must be one of: coins, fiat, mixed', NEW.compensation_mode;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_compensation_mode ON public.contribution_compensations;
CREATE TRIGGER trg_validate_compensation_mode
  BEFORE INSERT OR UPDATE ON public.contribution_compensations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_compensation_mode();

CREATE POLICY "Authenticated users can read compensations"
  ON public.contribution_compensations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert compensations"
  ON public.contribution_compensations FOR INSERT TO authenticated
  WITH CHECK (compensated_by = auth.uid());

CREATE POLICY "Users can update their own compensations"
  ON public.contribution_compensations FOR UPDATE TO authenticated
  USING (compensated_by = auth.uid()) WITH CHECK (compensated_by = auth.uid());