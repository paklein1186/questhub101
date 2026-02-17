
-- Update apply_monthly_demurrage to use cooperative_settings for treasury
CREATE OR REPLACE FUNCTION public.apply_monthly_demurrage(_fade_rate NUMERIC DEFAULT 0.015)
RETURNS TABLE(users_faded INTEGER, total_faded INTEGER, treasury_credited INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user RECORD;
  _fade INTEGER;
  _total_faded INTEGER := 0;
  _users_count INTEGER := 0;
  _current_treasury INTEGER;
BEGIN
  -- Process each user with positive balance (exclude exempt)
  FOR _user IN
    SELECT user_id, credits_balance
    FROM public.profiles
    WHERE credits_balance > 0
      AND demurrage_exempt = false
      AND (last_demurrage_at IS NULL OR last_demurrage_at < date_trunc('month', now()))
  LOOP
    _fade := GREATEST(1, FLOOR(_user.credits_balance * _fade_rate));
    
    UPDATE public.profiles
    SET credits_balance = credits_balance - _fade,
        lifetime_credits_faded = lifetime_credits_faded + _fade,
        last_demurrage_at = now()
    WHERE user_id = _user.user_id;

    INSERT INTO public.demurrage_log (user_id, balance_before, fade_amount, balance_after, fade_rate)
    VALUES (_user.user_id, _user.credits_balance, _fade, _user.credits_balance - _fade, _fade_rate);

    INSERT INTO public.credit_transactions (user_id, type, amount, source)
    VALUES (_user.user_id, 'DEMURRAGE_FADE', -_fade, 'Monthly ecosystem redistribution (1.5%)');

    _total_faded := _total_faded + _fade;
    _users_count := _users_count + 1;
  END LOOP;

  -- Credit treasury via cooperative_settings
  IF _total_faded > 0 THEN
    SELECT COALESCE((value)::integer, 0) INTO _current_treasury
    FROM public.cooperative_settings WHERE key = 'treasury_balance';

    UPDATE public.cooperative_settings
    SET value = to_jsonb(_current_treasury + _total_faded), updated_at = now()
    WHERE key = 'treasury_balance';
  END IF;

  RETURN QUERY SELECT _users_count, _total_faded, _total_faded;
END;
$$;

-- Update economy_stats view to use cooperative_settings for treasury
DROP VIEW IF EXISTS public.economy_stats;

CREATE VIEW public.economy_stats WITH (security_invoker = true) AS
SELECT
  (SELECT COALESCE(SUM(credits_balance), 0) FROM public.profiles WHERE demurrage_exempt = false) AS total_credits_in_circulation,
  (SELECT COALESCE((value)::integer, 0) FROM public.cooperative_settings WHERE key = 'treasury_balance') AS treasury_balance,
  (SELECT COALESCE(SUM(lifetime_credits_faded), 0) FROM public.profiles) AS total_lifetime_faded,
  (SELECT COALESCE(SUM(fade_amount), 0) FROM public.demurrage_log WHERE created_at >= date_trunc('month', now())) AS monthly_faded,
  (SELECT COALESCE(SUM(amount), 0) FROM public.credit_transactions WHERE amount > 0 AND created_at >= date_trunc('month', now())) AS monthly_minted,
  (SELECT COUNT(*) FROM public.profiles WHERE credits_balance > 0 AND demurrage_exempt = false) AS active_holders;

GRANT SELECT ON public.economy_stats TO anon, authenticated;
