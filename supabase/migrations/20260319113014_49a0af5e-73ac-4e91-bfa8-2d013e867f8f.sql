
-- 1. Add billing_currency to agents
ALTER TABLE public.agents
  ADD COLUMN billing_currency text NOT NULL DEFAULT 'credits';

ALTER TABLE public.agents
  ADD CONSTRAINT agents_billing_currency_check CHECK (billing_currency IN ('credits', 'coins', 'free'));

-- 2. Add monthly_agent_interactions to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN monthly_agent_interactions integer DEFAULT 0;

-- 3. Add agent interaction counters to profiles
ALTER TABLE public.profiles
  ADD COLUMN agent_interactions_this_month integer DEFAULT 0,
  ADD COLUMN agent_interactions_reset_at timestamptz;

-- 4. Helper function check_agent_billing
CREATE OR REPLACE FUNCTION public.check_agent_billing(
  _user_id uuid,
  _agent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agent record;
  _profile record;
  _plan_interactions integer;
  _result jsonb;
BEGIN
  -- Fetch agent
  SELECT id, cost_per_use, billing_currency
    INTO _agent
    FROM public.agents
    WHERE id = _agent_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'payment_type', 'error', 'amount', 0, 'reason', 'Agent not found');
  END IF;

  -- Free agents: always allow
  IF _agent.billing_currency = 'free' THEN
    RETURN jsonb_build_object('allowed', true, 'payment_type', 'free', 'amount', 0);
  END IF;

  -- Fetch user profile
  SELECT id, credits_balance, coins_balance,
         agent_interactions_this_month,
         agent_interactions_reset_at
    INTO _profile
    FROM public.profiles
    WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'payment_type', 'error', 'amount', 0, 'reason', 'Profile not found');
  END IF;

  -- Reset monthly counter if needed
  IF _profile.agent_interactions_reset_at IS NULL
     OR _profile.agent_interactions_reset_at < date_trunc('month', now()) THEN
    UPDATE public.profiles
      SET agent_interactions_this_month = 0,
          agent_interactions_reset_at = date_trunc('month', now())
      WHERE id = _user_id;
    _profile.agent_interactions_this_month := 0;
  END IF;

  -- Check plan-based free interactions
  SELECT COALESCE(sp.monthly_agent_interactions, 0)
    INTO _plan_interactions
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = _user_id
      AND us.status = 'active'
    ORDER BY sp.monthly_agent_interactions DESC NULLS LAST
    LIMIT 1;

  IF NOT FOUND THEN
    _plan_interactions := 0;
  END IF;

  -- If user has remaining free interactions from plan
  IF _profile.agent_interactions_this_month < _plan_interactions THEN
    UPDATE public.profiles
      SET agent_interactions_this_month = agent_interactions_this_month + 1
      WHERE id = _user_id;
    RETURN jsonb_build_object('allowed', true, 'payment_type', 'plan', 'amount', 0);
  END IF;

  -- Pay with credits
  IF _agent.billing_currency = 'credits' THEN
    IF _profile.credits_balance >= _agent.cost_per_use THEN
      UPDATE public.profiles
        SET credits_balance = credits_balance - _agent.cost_per_use
        WHERE id = _user_id;
      RETURN jsonb_build_object('allowed', true, 'payment_type', 'credits', 'amount', _agent.cost_per_use);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'payment_type', 'credits', 'amount', _agent.cost_per_use, 'reason', 'Insufficient credits');
    END IF;
  END IF;

  -- Pay with coins
  IF _agent.billing_currency = 'coins' THEN
    IF _profile.coins_balance >= _agent.cost_per_use THEN
      UPDATE public.profiles
        SET coins_balance = coins_balance - _agent.cost_per_use
        WHERE id = _user_id;
      RETURN jsonb_build_object('allowed', true, 'payment_type', 'coins', 'amount', _agent.cost_per_use);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'payment_type', 'coins', 'amount', _agent.cost_per_use, 'reason', 'Insufficient coins');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', false, 'payment_type', 'error', 'amount', 0, 'reason', 'Unknown billing currency');
END;
$$;
