
-- Add daily digest preference columns
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notify_daily_digest_in_app boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_daily_digest_email boolean NOT NULL DEFAULT false;
