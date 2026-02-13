
-- Add digest_frequency column to notification_preferences
-- Values: 'three_days' (default), 'weekly', 'none'
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS digest_frequency text NOT NULL DEFAULT 'three_days';

-- Add last_digest_sent_at to track when last digest was sent per user
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamptz;
