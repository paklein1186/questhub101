
-- FIX 1: Add last_ctg_demurrage_at column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_ctg_demurrage_at TIMESTAMPTZ;

-- FIX 1: Add commons CTG balance to cooperative_settings
INSERT INTO public.cooperative_settings (key, value)
VALUES ('ctg_commons_balance', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- FIX 1: CTG demurrage function
CREATE OR REPLACE FUNCTION public.apply_ctg_demurrage(
  _fade_rate NUMERIC DEFAULT 0.01
)
RETURNS TABLE(users_faded INTEGER, total_faded NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _user RECORD;
  _fade NUMERIC;
  _total NUMERIC := 0;
  _count INTEGER := 0;
BEGIN
  FOR _user IN
    SELECT user_id, ctg_balance FROM public.profiles
    WHERE ctg_balance > 0
      AND (last_ctg_demurrage_at IS NULL
           OR last_ctg_demurrage_at < date_trunc('month', now()))
  LOOP
    _fade := GREATEST(0.01, _user.ctg_balance * _fade_rate);
    UPDATE public.profiles
    SET ctg_balance = ctg_balance - _fade,
        last_ctg_demurrage_at = now()
    WHERE user_id = _user.user_id;
    INSERT INTO public.ctg_transactions (user_id, type, amount, balance_after, note)
    VALUES (_user.user_id, 'DEMURRAGE', -_fade,
      (SELECT ctg_balance FROM public.profiles WHERE user_id = _user.user_id),
      'Monthly CTG demurrage — 1%/month redistributed to commons');
    _total := _total + _fade;
    _count := _count + 1;
  END LOOP;
  -- Credit commons wallet
  IF _total > 0 THEN
    UPDATE public.cooperative_settings
    SET value = to_jsonb(COALESCE((value)::numeric, 0) + _total),
        updated_at = now()
    WHERE key = 'ctg_commons_balance';
  END IF;
  RETURN QUERY SELECT _count, _total;
END; $$;

-- FIX 2: Correct credit demurrage default from 1.5% to 1%
CREATE OR REPLACE FUNCTION public.apply_monthly_demurrage(_fade_rate NUMERIC DEFAULT 0.01)
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
    VALUES (_user.user_id, 'DEMURRAGE_FADE', -_fade, 'Monthly ecosystem redistribution (1%)');

    _total_faded := _total_faded + _fade;
    _users_count := _users_count + 1;
  END LOOP;

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
