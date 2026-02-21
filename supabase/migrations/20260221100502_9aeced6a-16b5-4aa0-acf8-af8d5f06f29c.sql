ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS public_visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS web_scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS web_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_order integer;