
-- Add path columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_path text,
  ADD COLUMN IF NOT EXISTS path_step integer;
