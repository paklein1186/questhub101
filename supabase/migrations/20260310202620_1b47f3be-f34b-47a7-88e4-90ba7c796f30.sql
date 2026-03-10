
-- MIGRATION 10B: Dual-currency quest campaigns

ALTER TABLE public.quest_campaigns
  ADD COLUMN IF NOT EXISTS campaign_currency TEXT NOT NULL DEFAULT 'coins',
  ADD COLUMN IF NOT EXISTS threshold_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS threshold_reached_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_mode TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES public.profiles(user_id);

ALTER TABLE public.quest_campaigns
  ADD CONSTRAINT chk_campaign_currency CHECK (campaign_currency IN ('coins','ctg')),
  ADD CONSTRAINT chk_dispatch_mode CHECK (dispatch_mode IN ('manual','auto_pie','auto_equal'));

-- Backfill existing campaign types
UPDATE public.quest_campaigns SET campaign_currency = 'coins' WHERE type = 'CREDITS';
UPDATE public.quest_campaigns SET campaign_currency = 'ctg' WHERE type = 'CTG';
