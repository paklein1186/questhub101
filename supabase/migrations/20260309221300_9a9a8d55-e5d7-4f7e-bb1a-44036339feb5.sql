
DROP FUNCTION IF EXISTS public.apply_monthly_demurrage(numeric);

CREATE OR REPLACE FUNCTION public.apply_monthly_demurrage(
  _fade_rate NUMERIC DEFAULT 0.01
)
RETURNS TABLE(
  credits_users_faded INTEGER,
  credits_total_faded INTEGER,
  ctg_users_faded INTEGER,
  ctg_total_faded INTEGER,
  treasury_credited INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user RECORD;
  _fade NUMERIC;
  _credits_users INT := 0;
  _credits_total INT := 0;
  _ctg_users INT := 0;
  _ctg_total INT := 0;
  _treasury_gain INT := 0;
BEGIN
  FOR _user IN
    SELECT user_id, credits_balance
    FROM public.profiles
    WHERE credits_balance > 0 AND demurrage_exempt = false
  LOOP
    _fade := GREATEST(1, FLOOR(_user.credits_balance * _fade_rate));
    UPDATE public.profiles
      SET credits_balance = credits_balance - _fade,
          lifetime_credits_faded = lifetime_credits_faded + _fade,
          updated_at = now()
      WHERE user_id = _user.user_id;
    INSERT INTO public.demurrage_log (user_id, balance_before, fade_amount, balance_after, fade_rate)
      VALUES (_user.user_id, _user.credits_balance, _fade, _user.credits_balance - _fade, _fade_rate);
    INSERT INTO public.credit_transactions (user_id, type, amount, source)
      VALUES (_user.user_id, 'DEMURRAGE_FADE', -_fade, 'Monthly ecosystem redistribution (1%)');
    _credits_users := _credits_users + 1;
    _credits_total := _credits_total + _fade::INT;
    _treasury_gain := _treasury_gain + _fade::INT;
  END LOOP;

  IF _treasury_gain > 0 THEN
    UPDATE public.cooperative_settings
      SET value = to_jsonb(COALESCE((value)::integer, 0) + _treasury_gain),
          updated_at = now()
      WHERE key = 'treasury_balance';
  END IF;

  FOR _user IN
    SELECT user_id, balance
    FROM public.ctg_wallets
    WHERE balance > 0
  LOOP
    _fade := GREATEST(1, FLOOR(_user.balance * _fade_rate));
    UPDATE public.ctg_wallets
      SET balance = balance - _fade,
          updated_at = now()
      WHERE user_id = _user.user_id;
    UPDATE public.profiles
      SET ctg_balance = ctg_balance - _fade
      WHERE user_id = _user.user_id;
    UPDATE public.ctg_commons_wallet
      SET balance = balance + _fade,
          lifetime_received = lifetime_received + _fade,
          updated_at = now();
    INSERT INTO public.ctg_transactions (
      user_id, amount, balance_after, type, note
    ) VALUES (
      _user.user_id,
      -_fade,
      (_user.balance - _fade),
      'DEMURRAGE_FADE',
      'Monthly 1% demurrage — returned to commons'
    );
    _ctg_users := _ctg_users + 1;
    _ctg_total := _ctg_total + _fade::INT;
  END LOOP;

  RETURN QUERY SELECT _credits_users, _credits_total, _ctg_users, _ctg_total, _treasury_gain;
END;
$$;
