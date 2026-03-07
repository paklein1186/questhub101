
DROP FUNCTION IF EXISTS public.set_ctg_exchange_rate(uuid, numeric, text);

CREATE FUNCTION public.set_ctg_exchange_rate(p_admin_id uuid, p_new_rate numeric, p_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  UPDATE public.ctg_exchange_rates SET active = false WHERE active = true;

  INSERT INTO public.ctg_exchange_rates (set_by_user_id, rate_ctg_to_credits, reason, active, valid_from)
  VALUES (p_admin_id, p_new_rate, p_reason, true, now())
  RETURNING json_build_object('id', id, 'rate', rate_ctg_to_credits, 'reason', reason) INTO result;

  RETURN result;
END;
$$;
