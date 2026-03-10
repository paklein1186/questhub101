
-- 20A: Create enum
CREATE TYPE public.contribution_type_enum AS ENUM (
  'TIME','EXPENSES','SUPPLIES','EQUIPMENT','FACILITIES',
  'SALES','ROYALTY','FINDERS_FEE','OTHER'
);

-- 20B: Convert column with mapping for legacy values
ALTER TABLE public.contribution_logs ALTER COLUMN contribution_type DROP DEFAULT;

ALTER TABLE public.contribution_logs
  ALTER COLUMN contribution_type TYPE public.contribution_type_enum
    USING (
      CASE
        WHEN contribution_type IN ('TIME','EXPENSES','SUPPLIES','EQUIPMENT','FACILITIES','SALES','ROYALTY','FINDERS_FEE','OTHER')
          THEN contribution_type::public.contribution_type_enum
        ELSE 'TIME'::public.contribution_type_enum
      END
    );

ALTER TABLE public.contribution_logs
  ALTER COLUMN contribution_type SET DEFAULT 'TIME'::public.contribution_type_enum,
  ALTER COLUMN contribution_type SET NOT NULL;

-- Add new columns
ALTER TABLE public.contribution_logs
  ADD COLUMN IF NOT EXISTS fmv_input JSONB,
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS cash_multiplier NUMERIC(4,2) DEFAULT 2.00;

-- Backfill existing TIME rows
UPDATE public.contribution_logs
SET fmv_input = jsonb_build_object(
  'half_days', COALESCE(half_days, 0),
  'difficulty', COALESCE(difficulty::text, 'STANDARD')
)
WHERE fmv_input IS NULL AND contribution_type = 'TIME';

-- 20C: Guild columns
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS cash_multiplier NUMERIC(4,2) NOT NULL DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS sales_commission_default_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS evidence_required_override BOOLEAN DEFAULT NULL;

-- 20D: Evidence storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('contribution-evidence', 'contribution-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contribution-evidence');

CREATE POLICY "Authenticated users can read evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contribution-evidence');

-- 20E: FMV computation function
CREATE OR REPLACE FUNCTION public.compute_contribution_fmv(
  p_type public.contribution_type_enum,
  p_fmv_input JSONB,
  p_guild_fmv_rate NUMERIC,
  p_cash_multiplier NUMERIC,
  p_difficulty TEXT DEFAULT 'STANDARD'
) RETURNS NUMERIC AS $$
DECLARE
  result NUMERIC := 0;
  diff_mult NUMERIC;
BEGIN
  diff_mult := CASE p_difficulty
    WHEN 'STANDARD' THEN 1.0
    WHEN 'COMPLEX' THEN 1.5
    WHEN 'EXPERT' THEN 2.0
    WHEN 'EXCEPTIONAL' THEN 3.0
    ELSE 1.0
  END;
  CASE p_type
    WHEN 'TIME' THEN
      result := COALESCE((p_fmv_input->>'half_days')::NUMERIC, 0) * p_guild_fmv_rate * diff_mult;
    WHEN 'EXPENSES', 'SUPPLIES', 'EQUIPMENT', 'FACILITIES' THEN
      result := COALESCE((p_fmv_input->>'amount_eur')::NUMERIC, 0) * p_cash_multiplier;
    WHEN 'SALES' THEN
      result := COALESCE((p_fmv_input->>'deal_value_eur')::NUMERIC, 0) * COALESCE((p_fmv_input->>'commission_pct')::NUMERIC, 0) / 100.0;
    WHEN 'FINDERS_FEE' THEN
      result := COALESCE((p_fmv_input->>'deal_value_eur')::NUMERIC, 0) * COALESCE((p_fmv_input->>'finders_pct')::NUMERIC, 0) / 100.0;
    WHEN 'ROYALTY', 'OTHER' THEN
      result := COALESCE((p_fmv_input->>'amount_eur')::NUMERIC, 0);
  END CASE;
  RETURN ROUND(result, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function
CREATE OR REPLACE FUNCTION public.trg_compute_contribution_fmv()
RETURNS TRIGGER AS $$
DECLARE
  g_rate NUMERIC; g_mult NUMERIC;
BEGIN
  SELECT fmv_rate_per_half_day, cash_multiplier INTO g_rate, g_mult
    FROM public.guilds WHERE id = NEW.guild_id;
  IF NEW.cash_multiplier IS NOT NULL THEN g_mult := NEW.cash_multiplier; END IF;
  g_rate := COALESCE(g_rate, 200);
  g_mult := COALESCE(g_mult, 2.00);
  NEW.fmv_value := public.compute_contribution_fmv(
    NEW.contribution_type, NEW.fmv_input, g_rate, g_mult,
    COALESCE((NEW.fmv_input->>'difficulty')::TEXT, 'STANDARD')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contribution_fmv ON public.contribution_logs;
CREATE TRIGGER trg_contribution_fmv
  BEFORE INSERT OR UPDATE OF fmv_input, contribution_type, cash_multiplier
  ON public.contribution_logs
  FOR EACH ROW EXECUTE FUNCTION public.trg_compute_contribution_fmv();
