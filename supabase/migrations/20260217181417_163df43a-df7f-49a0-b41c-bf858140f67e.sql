
-- ═══ Demurrage Economy v2 Schema ═══

-- 1. Add demurrage tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lifetime_credits_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_credits_spent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_credits_faded INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS demurrage_exempt BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_demurrage_at TIMESTAMPTZ;

-- 2. Create demurrage_log table for audit trail
CREATE TABLE IF NOT EXISTS public.demurrage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  balance_before INTEGER NOT NULL,
  fade_amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  fade_rate NUMERIC(5,4) NOT NULL DEFAULT 0.015,
  treasury_credited BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.demurrage_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own demurrage history
CREATE POLICY "Users can view own demurrage log"
  ON public.demurrage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all demurrage logs"
  ON public.demurrage_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Add DEMURRAGE_FADE to credit_transactions type support
-- (no enum change needed, type is text column)

-- 4. Create treasury stats view for public dashboard
CREATE OR REPLACE VIEW public.economy_stats AS
SELECT
  (SELECT COALESCE(SUM(credits_balance), 0) FROM public.profiles WHERE demurrage_exempt = false) AS total_credits_in_circulation,
  (SELECT COALESCE(credits_balance, 0) FROM public.profiles WHERE demurrage_exempt = true LIMIT 1) AS treasury_balance,
  (SELECT COALESCE(SUM(lifetime_credits_faded), 0) FROM public.profiles) AS total_lifetime_faded,
  (SELECT COALESCE(SUM(fade_amount), 0) FROM public.demurrage_log WHERE created_at >= date_trunc('month', now())) AS monthly_faded,
  (SELECT COALESCE(SUM(amount), 0) FROM public.credit_transactions WHERE amount > 0 AND created_at >= date_trunc('month', now())) AS monthly_minted,
  (SELECT COUNT(*) FROM public.profiles WHERE credits_balance > 0 AND demurrage_exempt = false) AS active_holders;

-- 5. Update protect_profile_sensitive_fields to also protect new columns
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    NEW.credits_balance := OLD.credits_balance;
    NEW.xp := OLD.xp;
    NEW.xp_level := OLD.xp_level;
    NEW.xp_recent_12m := OLD.xp_recent_12m;
    NEW.contribution_index := OLD.contribution_index;
    NEW.total_shares_a := OLD.total_shares_a;
    NEW.total_shares_b := OLD.total_shares_b;
    NEW.governance_weight := OLD.governance_weight;
    NEW.is_cooperative_member := OLD.is_cooperative_member;
    NEW.lifetime_credits_earned := OLD.lifetime_credits_earned;
    NEW.lifetime_credits_spent := OLD.lifetime_credits_spent;
    NEW.lifetime_credits_faded := OLD.lifetime_credits_faded;
    NEW.demurrage_exempt := OLD.demurrage_exempt;
    NEW.last_demurrage_at := OLD.last_demurrage_at;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create RPC for applying demurrage (called by edge function with service role)
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
  _treasury_id UUID;
BEGIN
  -- Find treasury profile
  SELECT user_id INTO _treasury_id FROM public.profiles WHERE demurrage_exempt = true LIMIT 1;
  
  IF _treasury_id IS NULL THEN
    RAISE EXCEPTION 'Treasury profile not found';
  END IF;

  -- Process each user with positive balance (exclude treasury)
  FOR _user IN
    SELECT user_id, credits_balance
    FROM public.profiles
    WHERE credits_balance > 0
      AND demurrage_exempt = false
      AND (last_demurrage_at IS NULL OR last_demurrage_at < date_trunc('month', now()))
  LOOP
    -- Calculate fade (round down, minimum 1 if balance > 0)
    _fade := GREATEST(1, FLOOR(_user.credits_balance * _fade_rate));
    
    -- Debit user
    UPDATE public.profiles
    SET credits_balance = credits_balance - _fade,
        lifetime_credits_faded = lifetime_credits_faded + _fade,
        last_demurrage_at = now()
    WHERE user_id = _user.user_id;

    -- Log in demurrage_log
    INSERT INTO public.demurrage_log (user_id, balance_before, fade_amount, balance_after, fade_rate)
    VALUES (_user.user_id, _user.credits_balance, _fade, _user.credits_balance - _fade, _fade_rate);

    -- Log in credit_transactions
    INSERT INTO public.credit_transactions (user_id, type, amount, source)
    VALUES (_user.user_id, 'DEMURRAGE_FADE', -_fade, 'Monthly ecosystem redistribution (1.5%)');

    _total_faded := _total_faded + _fade;
    _users_count := _users_count + 1;
  END LOOP;

  -- Credit treasury
  IF _total_faded > 0 THEN
    UPDATE public.profiles
    SET credits_balance = credits_balance + _total_faded
    WHERE user_id = _treasury_id;

    INSERT INTO public.credit_transactions (user_id, type, amount, source)
    VALUES (_treasury_id, 'TREASURY_DEMURRAGE_RECEIVED', _total_faded, 
            'Redistributed from ' || _users_count || ' wallets');
  END IF;

  RETURN QUERY SELECT _users_count, _total_faded, _total_faded;
END;
$$;
