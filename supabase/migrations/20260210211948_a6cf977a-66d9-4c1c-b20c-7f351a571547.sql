
-- Add monetization columns to quests table
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS credit_reward integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_fiat integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_currency text NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS payout_user_id uuid REFERENCES auth.users(id);
