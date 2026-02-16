-- Add pulse_nudge_sent to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pulse_nudge_sent boolean NOT NULL DEFAULT false;

-- Add AI_PROFILE_ENRICHMENT notification type support (notifications table already supports dynamic types)