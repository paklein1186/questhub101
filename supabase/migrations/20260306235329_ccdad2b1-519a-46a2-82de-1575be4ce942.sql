
-- 1. transfer_ctg
CREATE OR REPLACE FUNCTION public.transfer_ctg(
  p_from_user_id UUID, p_to_user_id UUID, p_amount NUMERIC, p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_balance NUMERIC;
  to_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
  IF p_from_user_id = p_to_user_id THEN RAISE EXCEPTION 'Cannot transfer to yourself'; END IF;

  -- Lock sender
  SELECT balance INTO from_balance FROM ctg_wallets WHERE user_id = p_from_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sender wallet not found'; END IF;
  IF from_balance < p_amount THEN RAISE EXCEPTION 'Insufficient $CTG balance'; END IF;

  -- Deduct sender
  UPDATE ctg_wallets SET balance = balance - p_amount, lifetime_spent = lifetime_spent + p_amount, updated_at = now()
  WHERE user_id = p_from_user_id;
  from_balance := from_balance - p_amount;

  -- Upsert receiver
  INSERT INTO ctg_wallets (user_id, balance, lifetime_earned, updated_at)
  VALUES (p_to_user_id, p_amount, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = ctg_wallets.balance + p_amount,
    lifetime_earned = ctg_wallets.lifetime_earned + p_amount,
    updated_at = now();
  SELECT balance INTO to_balance FROM ctg_wallets WHERE user_id = p_to_user_id;

  -- Transactions
  INSERT INTO ctg_transactions (user_id, amount, type, counterpart_user_id, note, balance_after)
  VALUES (p_from_user_id, -p_amount, 'TRANSFER_OUT', p_to_user_id, p_note, from_balance);

  INSERT INTO ctg_transactions (user_id, amount, type, counterpart_user_id, note, balance_after)
  VALUES (p_to_user_id, p_amount, 'TRANSFER_IN', p_from_user_id, p_note, to_balance);

  -- Denormalize
  UPDATE profiles SET ctg_balance = from_balance WHERE user_id = p_from_user_id;
  UPDATE profiles SET ctg_balance = to_balance WHERE user_id = p_to_user_id;

  RETURN jsonb_build_object('new_balance_from', from_balance, 'new_balance_to', to_balance, 'amount', p_amount);
END;
$$;

-- 2. exchange_ctg_to_credits
CREATE OR REPLACE FUNCTION public.exchange_ctg_to_credits(p_user_id UUID, p_ctg_amount NUMERIC)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
  v_credits INTEGER;
  v_balance NUMERIC;
BEGIN
  IF p_ctg_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT rate_ctg_to_credits INTO v_rate FROM ctg_exchange_rates WHERE active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active exchange rate configured'; END IF;

  v_credits := FLOOR(p_ctg_amount * v_rate);

  SELECT balance INTO v_balance FROM ctg_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_balance < p_ctg_amount THEN RAISE EXCEPTION 'Insufficient $CTG balance'; END IF;

  UPDATE ctg_wallets SET balance = balance - p_ctg_amount, lifetime_spent = lifetime_spent + p_ctg_amount, updated_at = now()
  WHERE user_id = p_user_id;
  v_balance := v_balance - p_ctg_amount;

  INSERT INTO ctg_transactions (user_id, amount, type, note, balance_after)
  VALUES (p_user_id, -p_ctg_amount, 'EXCHANGE_TO_CREDITS',
          'Exchanged ' || p_ctg_amount || ' $CTG for ' || v_credits || ' credits at rate ' || v_rate,
          v_balance);

  -- Grant credits via existing function
  PERFORM grant_credits_admin(p_user_id, v_credits, 'ctg_exchange', '$CTG exchange');

  UPDATE profiles SET ctg_balance = v_balance WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ctg_spent', p_ctg_amount, 'credits_received', v_credits, 'rate_used', v_rate);
END;
$$;

-- 3. admin_grant_ctg
CREATE OR REPLACE FUNCTION public.admin_grant_ctg(
  p_admin_id UUID, p_user_id UUID, p_amount NUMERIC, p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role IN ('admin', 'superadmin')) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  INSERT INTO ctg_wallets (user_id, balance, lifetime_earned, updated_at)
  VALUES (p_user_id, p_amount, p_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = ctg_wallets.balance + p_amount,
    lifetime_earned = ctg_wallets.lifetime_earned + p_amount,
    updated_at = now();

  SELECT balance INTO v_balance FROM ctg_wallets WHERE user_id = p_user_id;

  INSERT INTO ctg_transactions (user_id, amount, type, note, balance_after)
  VALUES (p_user_id, p_amount, 'ADMIN_GRANT', COALESCE(p_note, 'Admin grant by ' || p_admin_id::text), v_balance);

  UPDATE profiles SET ctg_balance = v_balance WHERE user_id = p_user_id;

  RETURN jsonb_build_object('new_balance', v_balance, 'granted', p_amount);
END;
$$;

-- 4. admin_deduct_ctg
CREATE OR REPLACE FUNCTION public.admin_deduct_ctg(
  p_admin_id UUID, p_user_id UUID, p_amount NUMERIC, p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
  v_deduct NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role IN ('admin', 'superadmin')) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT balance INTO v_balance FROM ctg_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User wallet not found'; END IF;

  v_deduct := LEAST(p_amount, v_balance);

  UPDATE ctg_wallets SET balance = balance - v_deduct, lifetime_spent = lifetime_spent + v_deduct, updated_at = now()
  WHERE user_id = p_user_id;
  v_balance := v_balance - v_deduct;

  INSERT INTO ctg_transactions (user_id, amount, type, note, balance_after)
  VALUES (p_user_id, -v_deduct, 'ADMIN_DEDUCT', COALESCE(p_note, 'Admin deduct by ' || p_admin_id::text), v_balance);

  UPDATE profiles SET ctg_balance = v_balance WHERE user_id = p_user_id;

  RETURN jsonb_build_object('new_balance', v_balance, 'deducted', v_deduct);
END;
$$;

-- 5. set_ctg_exchange_rate
CREATE OR REPLACE FUNCTION public.set_ctg_exchange_rate(
  p_admin_id UUID, p_new_rate NUMERIC, p_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_rate NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role IN ('admin', 'superadmin')) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  IF p_new_rate <= 0 THEN RAISE EXCEPTION 'Rate must be positive'; END IF;

  SELECT rate_ctg_to_credits INTO v_old_rate FROM ctg_exchange_rates WHERE active = true;

  UPDATE ctg_exchange_rates SET active = false WHERE active = true;

  INSERT INTO ctg_exchange_rates (rate_ctg_to_credits, set_by_user_id, reason, active, valid_from)
  VALUES (p_new_rate, p_admin_id, p_reason, true, now());

  RETURN jsonb_build_object('previous_rate', COALESCE(v_old_rate, 0), 'new_rate', p_new_rate);
END;
$$;
