
-- Add payment and acceptance fields to guild_events
ALTER TABLE public.guild_events
  ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_per_ticket numeric DEFAULT null,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS acceptance_mode text NOT NULL DEFAULT 'AUTO',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PUBLISHED';

-- Add payment fields to guild_event_attendees
ALTER TABLE public.guild_event_attendees
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text DEFAULT null,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz DEFAULT null,
  ADD COLUMN IF NOT EXISTS notes text DEFAULT null;
