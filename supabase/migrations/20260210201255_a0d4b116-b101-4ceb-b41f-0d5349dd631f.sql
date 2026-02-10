
-- 1. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp_recent_12m integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_xp_recalculated_at timestamptz;

-- 2. Create xp_events table
CREATE TABLE public.xp_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount integer NOT NULL,
  topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
  territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL,
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_user_id ON public.xp_events(user_id);
CREATE INDEX idx_xp_events_user_type ON public.xp_events(user_id, type);
CREATE INDEX idx_xp_events_created_at ON public.xp_events(created_at);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own XP events
CREATE POLICY "Users can read own xp_events"
  ON public.xp_events FOR SELECT
  USING (auth.uid() = user_id);

-- Only backend (service role) inserts; no direct user inserts
CREATE POLICY "Service role inserts xp_events"
  ON public.xp_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Create credit_transactions table
CREATE TABLE public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount integer NOT NULL,
  source text,
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_user_type ON public.credit_transactions(user_id, type);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own credit transactions
CREATE POLICY "Users can read own credit_transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own credit transactions (from client helpers)
CREATE POLICY "Users can insert own credit_transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Backfill xp_level from existing xp values
UPDATE public.profiles SET xp_level = CASE
  WHEN xp >= 1500 THEN 5
  WHEN xp >= 500 THEN 4
  WHEN xp >= 150 THEN 3
  WHEN xp >= 50 THEN 2
  ELSE 1
END;
