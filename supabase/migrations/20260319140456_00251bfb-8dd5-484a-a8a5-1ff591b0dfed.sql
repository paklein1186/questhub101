
-- 1. Add pricing fields to agents table
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS hire_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_calls_limit integer DEFAULT NULL;

-- Migrate existing data: paid agents (cost_per_use > 0) become "paid"
UPDATE public.agents
SET pricing_mode = 'paid',
    usage_price = cost_per_use
WHERE cost_per_use > 0 AND billing_currency != 'free';

-- 2. Create agent_transactions table
CREATE TABLE public.agent_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'hire' or 'usage'
  amount numeric NOT NULL DEFAULT 0,
  coin_value numeric NOT NULL DEFAULT 0,
  credits_used numeric NOT NULL DEFAULT 0,
  coins_used numeric NOT NULL DEFAULT 0,
  creator_share numeric NOT NULL DEFAULT 0,
  platform_share numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can view own agent transactions"
  ON public.agent_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can create own agent transactions"
  ON public.agent_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Agent creators can view transactions for their agents
CREATE POLICY "Creators can view agent transactions"
  ON public.agent_transactions FOR SELECT TO authenticated
  USING (agent_id IN (SELECT id FROM public.agents WHERE creator_user_id = auth.uid()));

-- 3. Create process_payment function
CREATE OR REPLACE FUNCTION public.process_agent_payment(
  p_user_id uuid,
  p_amount numeric,
  p_agent_id uuid,
  p_type text -- 'hire' or 'usage'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits_balance numeric;
  v_coins_balance numeric;
  v_credits_used numeric := 0;
  v_coins_used numeric := 0;
  v_remaining numeric;
  v_creator_id uuid;
  v_creator_share numeric;
  v_platform_share numeric;
  v_platform_fee numeric := 0.20; -- 20% platform fee
BEGIN
  -- If amount is 0, just return success
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'coin_value', 0, 'credits_used', 0, 'coins_used', 0);
  END IF;

  -- Lock user row
  SELECT credits_balance, coins_balance INTO v_credits_balance, v_coins_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check total available
  IF (v_credits_balance + v_coins_balance) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct: credits first, then coins
  v_remaining := p_amount;

  IF v_credits_balance > 0 THEN
    v_credits_used := LEAST(v_credits_balance, v_remaining);
    v_remaining := v_remaining - v_credits_used;
  END IF;

  IF v_remaining > 0 THEN
    v_coins_used := v_remaining;
  END IF;

  -- Update balances
  UPDATE profiles
  SET credits_balance = credits_balance - v_credits_used,
      coins_balance = coins_balance - v_coins_used
  WHERE user_id = p_user_id;

  -- Calculate revenue shares (everything normalized to coin value)
  v_creator_share := p_amount * (1.0 - v_platform_fee);
  v_platform_share := p_amount * v_platform_fee;

  -- Get creator
  SELECT creator_user_id INTO v_creator_id FROM agents WHERE id = p_agent_id;

  -- Pay creator in coins
  IF v_creator_id IS NOT NULL AND v_creator_share > 0 THEN
    UPDATE profiles
    SET coins_balance = coins_balance + v_creator_share
    WHERE user_id = v_creator_id;
  END IF;

  -- Record transaction
  INSERT INTO agent_transactions (user_id, agent_id, type, amount, coin_value, credits_used, coins_used, creator_share, platform_share)
  VALUES (p_user_id, p_agent_id, p_type, p_amount, p_amount, v_credits_used, v_coins_used, v_creator_share, v_platform_share);

  -- Record coin transaction for creator
  IF v_creator_id IS NOT NULL AND v_creator_share > 0 THEN
    INSERT INTO coin_transactions (user_id, amount, type, source, related_entity_id, related_entity_type)
    VALUES (v_creator_id, v_creator_share, 'earn', 'agent_' || p_type, p_agent_id, 'agent');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'coin_value', p_amount,
    'credits_used', v_credits_used,
    'coins_used', v_coins_used,
    'creator_share', v_creator_share,
    'platform_share', v_platform_share
  );
END;
$$;
