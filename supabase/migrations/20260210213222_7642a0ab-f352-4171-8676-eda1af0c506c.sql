
-- Add persona fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS persona_type TEXT NOT NULL DEFAULT 'UNSET',
  ADD COLUMN IF NOT EXISTS persona_confidence REAL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS persona_source TEXT DEFAULT NULL;
