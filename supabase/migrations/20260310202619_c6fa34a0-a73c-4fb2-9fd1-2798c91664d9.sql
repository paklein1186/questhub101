
-- MIGRATION 10A: Deprecate credit_budget, add dual Coins+CTG pools

ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS coins_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_escrow NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_escrow_status TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS ctg_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctg_escrow NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctg_escrow_status TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS ctg_escrow_frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS envelope_currency TEXT NOT NULL DEFAULT 'coins';

-- Add check constraints
ALTER TABLE public.quests
  ADD CONSTRAINT chk_coins_escrow_status CHECK (coins_escrow_status IN ('idle','active','released','refunded')),
  ADD CONSTRAINT chk_ctg_escrow_status CHECK (ctg_escrow_status IN ('idle','active','released','refunded')),
  ADD CONSTRAINT chk_envelope_currency CHECK (envelope_currency IN ('coins'));

-- Backfill from existing coin_budget/coin_escrow columns
UPDATE public.quests SET coins_budget = coin_budget, coins_escrow = coin_escrow
  WHERE coin_budget > 0 OR coin_escrow > 0;
