
-- Add new instant email preference columns to notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS instant_email_for_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS instant_email_for_invites boolean NOT NULL DEFAULT true;

-- Update existing rows with digest_frequency='three_days' to 'twice_weekly'
UPDATE public.notification_preferences
  SET digest_frequency = 'twice_weekly'
  WHERE digest_frequency = 'three_days';
