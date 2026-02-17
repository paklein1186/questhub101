-- Add currency fields to quest_proposals for fiat support
ALTER TABLE public.quest_proposals 
ADD COLUMN IF NOT EXISTS requested_fiat numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS requested_currency text DEFAULT 'CREDITS';
