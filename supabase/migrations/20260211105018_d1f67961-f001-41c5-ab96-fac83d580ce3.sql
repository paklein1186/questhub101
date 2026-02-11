
-- Add filter_by_houses preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS filter_by_houses boolean NOT NULL DEFAULT false;
