
-- Add missing columns to revenue_share_records for agent revenue sharing
ALTER TABLE public.revenue_share_records
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.agents(id),
  ADD COLUMN IF NOT EXISTS share_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'credits';

-- Make usage_record_id nullable since we may not always have one
ALTER TABLE public.revenue_share_records
  ALTER COLUMN usage_record_id DROP NOT NULL;
