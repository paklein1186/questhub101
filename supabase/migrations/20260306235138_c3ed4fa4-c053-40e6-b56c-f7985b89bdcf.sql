
-- =============================================
-- $CTG Token Infrastructure
-- =============================================

-- 1. ctg_wallets
CREATE TABLE public.ctg_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned NUMERIC NOT NULL DEFAULT 0,
  lifetime_spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ctg_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctg_wallets_select_public" ON public.ctg_wallets
  FOR SELECT USING (true);

CREATE POLICY "ctg_wallets_insert_service" ON public.ctg_wallets
  FOR INSERT WITH CHECK (false);

CREATE POLICY "ctg_wallets_update_service" ON public.ctg_wallets
  FOR UPDATE USING (false);

-- 2. ctg_transactions
CREATE TABLE public.ctg_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'EARNED_QUEST', 'EARNED_SUBTASK', 'EARNED_SERVICE',
    'EARNED_RITUAL', 'EARNED_GOVERNANCE', 'EARNED_MENTORSHIP',
    'TRANSFER_IN', 'TRANSFER_OUT',
    'EXCHANGE_TO_CREDITS', 'DEMURRAGE',
    'COMMONS_EMISSION', 'ADMIN_GRANT', 'ADMIN_DEDUCT'
  )),
  related_entity_type TEXT,
  related_entity_id TEXT,
  counterpart_user_id UUID,
  note TEXT,
  balance_after NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ctg_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctg_transactions_select_own" ON public.ctg_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "ctg_transactions_insert_service" ON public.ctg_transactions
  FOR INSERT WITH CHECK (false);

-- 3. ctg_exchange_rates
CREATE TABLE public.ctg_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_ctg_to_credits NUMERIC NOT NULL DEFAULT 10,
  set_by_user_id UUID NOT NULL,
  reason TEXT,
  active BOOLEAN NOT NULL DEFAULT false,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ctg_exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX ctg_exchange_rates_single_active
  ON public.ctg_exchange_rates (active) WHERE active = true;

CREATE POLICY "ctg_exchange_rates_select_public" ON public.ctg_exchange_rates
  FOR SELECT USING (true);

CREATE POLICY "ctg_exchange_rates_insert_service" ON public.ctg_exchange_rates
  FOR INSERT WITH CHECK (false);

CREATE POLICY "ctg_exchange_rates_update_service" ON public.ctg_exchange_rates
  FOR UPDATE USING (false);

-- 4. ctg_emission_rules
CREATE TABLE public.ctg_emission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_type TEXT NOT NULL UNIQUE,
  ctg_amount NUMERIC NOT NULL DEFAULT 0,
  commons_share_percent NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ctg_emission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctg_emission_rules_select_public" ON public.ctg_emission_rules
  FOR SELECT USING (true);

CREATE POLICY "ctg_emission_rules_insert_service" ON public.ctg_emission_rules
  FOR INSERT WITH CHECK (false);

CREATE POLICY "ctg_emission_rules_update_service" ON public.ctg_emission_rules
  FOR UPDATE USING (false);

INSERT INTO public.ctg_emission_rules (contribution_type, ctg_amount, commons_share_percent, is_active) VALUES
  ('subtask_completed', 5, 10, true),
  ('quest_completed', 25, 10, true),
  ('proposal_accepted', 15, 10, true),
  ('review_given', 3, 10, true),
  ('ritual_participation', 10, 10, true),
  ('documentation', 8, 10, true),
  ('mentorship', 12, 10, true),
  ('governance_vote', 2, 10, true),
  ('ecological_annotation', 7, 10, true);

-- 5. ctg_commons_wallet (singleton)
CREATE TABLE public.ctg_commons_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance NUMERIC NOT NULL DEFAULT 0,
  lifetime_received NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ctg_commons_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ctg_commons_wallet_select_public" ON public.ctg_commons_wallet
  FOR SELECT USING (true);

CREATE POLICY "ctg_commons_wallet_update_service" ON public.ctg_commons_wallet
  FOR UPDATE USING (false);

INSERT INTO public.ctg_commons_wallet (balance, lifetime_received) VALUES (0, 0);

-- Add ctg_balance to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ctg_balance NUMERIC NOT NULL DEFAULT 0;

-- Trigger for updated_at on ctg_wallets
CREATE OR REPLACE FUNCTION public.update_ctg_wallet_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ctg_wallets_updated_at
  BEFORE UPDATE ON public.ctg_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ctg_wallet_updated_at();

-- Indexes
CREATE INDEX idx_ctg_transactions_user_id ON public.ctg_transactions (user_id);
CREATE INDEX idx_ctg_transactions_created_at ON public.ctg_transactions (created_at DESC);
CREATE INDEX idx_ctg_transactions_type ON public.ctg_transactions (type);
CREATE INDEX idx_ctg_wallets_user_id ON public.ctg_wallets (user_id);
