
-- Subscription plan status enum
CREATE TYPE public.subscription_status AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED', 'TRIAL');

-- XP transaction type enum
CREATE TYPE public.xp_transaction_type AS ENUM ('PURCHASE', 'ACTION_SPEND', 'REWARD', 'ADJUSTMENT', 'REFUND');

-- ─── Subscription Plans ─────────────────────────────────────
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price_amount NUMERIC(10,2),
  monthly_price_currency TEXT NOT NULL DEFAULT 'EUR',
  free_quests_per_week INTEGER NOT NULL DEFAULT 1,
  max_guild_memberships INTEGER,
  max_pods INTEGER,
  xp_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  marketplace_fee_percent NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT
  USING (true);

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.subscription_plans (code, name, description, monthly_price_amount, free_quests_per_week, max_guild_memberships, max_pods, xp_multiplier, marketplace_fee_percent)
VALUES
  ('FREE', 'Free', 'Get started with basic features.', 0, 1, 3, 1, 1.0, 15.0),
  ('IMPACT_PLUS', 'Impact+', 'For active gamechangers who want more.', 9.99, 5, 10, 3, 1.5, 10.0),
  ('ECOSYSTEM_PRO', 'Ecosystem Pro', 'For ecosystem builders managing guilds and networks.', 29.99, 20, NULL, NULL, 2.0, 5.0);

-- ─── Add current_plan_code to profiles ──────────────────────
ALTER TABLE public.profiles
  ADD COLUMN current_plan_code TEXT DEFAULT 'FREE';

-- ─── User Subscriptions ─────────────────────────────────────
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'ACTIVE',
  stripe_subscription_id TEXT,
  valid_until TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at TIMESTAMPTZ,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index: at most one current subscription per user
CREATE UNIQUE INDEX idx_user_subscriptions_current
  ON public.user_subscriptions (user_id) WHERE is_current = true;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── XP Transactions ────────────────────────────────────────
CREATE TABLE public.xp_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.xp_transaction_type NOT NULL,
  amount_xp INTEGER NOT NULL,
  description TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own xp transactions"
  ON public.xp_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own xp transactions"
  ON public.xp_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Weekly Usage ───────────────────────────────────────────
CREATE TABLE public.weekly_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  quests_created_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

ALTER TABLE public.weekly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly usage"
  ON public.weekly_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly usage"
  ON public.weekly_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly usage"
  ON public.weekly_usage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_weekly_usage_updated_at
  BEFORE UPDATE ON public.weekly_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-assign FREE subscription on new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'GAMECHANGER')
  );

  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE code = 'FREE' LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status, is_current)
    VALUES (NEW.id, free_plan_id, 'ACTIVE', true);
  END IF;

  RETURN NEW;
END;
$$;
