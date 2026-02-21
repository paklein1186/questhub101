-- Update check constraint to include 'company'
ALTER TABLE public.site_codes DROP CONSTRAINT IF EXISTS site_codes_owner_type_check;
ALTER TABLE public.site_codes ADD CONSTRAINT site_codes_owner_type_check CHECK (owner_type IN ('user', 'guild', 'territory', 'program', 'company'));

-- Fix the existing record
UPDATE public.site_codes SET owner_type = 'company' WHERE id = '1f917506-9f9c-4ec0-a2b9-c6c3263b38e0';
