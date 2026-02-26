ALTER TABLE public.gameb_withdrawal_requests 
ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;