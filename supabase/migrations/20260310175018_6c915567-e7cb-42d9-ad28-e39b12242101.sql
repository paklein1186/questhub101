CREATE OR REPLACE FUNCTION public.validate_governance_model()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.governance_model NOT IN ('1h1v', 'soft_log', 'strong_log', 'pure_pct') THEN
    RAISE EXCEPTION 'Invalid governance_model: %. Must be one of: 1h1v, soft_log, strong_log, pure_pct', NEW.governance_model;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_governance_model ON public.guilds;
CREATE TRIGGER trg_validate_governance_model
  BEFORE INSERT OR UPDATE ON public.guilds
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_governance_model();