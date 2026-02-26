
-- =============================================
-- Dual Currency: Platform Credits + GameB Tokens
-- =============================================

-- 1. Add gameb_tokens_balance to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gameb_tokens_balance NUMERIC NOT NULL DEFAULT 0;

-- 2. Add gameb_tokens to collective wallets
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS gameb_tokens_balance NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS gameb_tokens_balance NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS gameb_tokens_balance NUMERIC NOT NULL DEFAULT 0;

-- 3. GameB Token transactions (fiat-backed)
CREATE TABLE IF NOT EXISTS public.gameb_token_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL, -- 'quest_earned', 'quest_funded', 'redistribution', 'withdrawal', 'fiat_deposit'
  related_entity_type TEXT,
  related_entity_id UUID,
  source TEXT,
  fiat_backing_amount NUMERIC DEFAULT 0, -- the fiat € amount backing this token movement
  fiat_currency TEXT DEFAULT 'EUR',
  quest_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Withdrawal requests (GameB Tokens → Fiat)
CREATE TABLE IF NOT EXISTS public.gameb_withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_tokens NUMERIC NOT NULL,
  amount_fiat NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, processing, completed, rejected
  stripe_transfer_id TEXT,
  stripe_connect_account_id TEXT,
  admin_note TEXT,
  reviewed_by_user_id UUID,
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Stripe Connect accounts for contributors
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN NOT NULL DEFAULT false;

-- 6. Quest budget tracking in GameB Tokens
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS gameb_token_budget NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gameb_token_escrow NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gameb_token_escrow_status TEXT NOT NULL DEFAULT 'none';

-- RLS
ALTER TABLE public.gameb_token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gameb_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users read own gameb transactions"
  ON public.gameb_token_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service/admin can insert
CREATE POLICY "Insert gameb transactions"
  ON public.gameb_token_transactions FOR INSERT TO authenticated
  WITH CHECK (true);

-- Users can read their own withdrawal requests
CREATE POLICY "Users read own withdrawals"
  ON public.gameb_withdrawal_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Users can create withdrawal requests
CREATE POLICY "Users create withdrawals"
  ON public.gameb_withdrawal_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can update withdrawal requests
CREATE POLICY "Admins manage withdrawals"
  ON public.gameb_withdrawal_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.gameb_token_transactions;
