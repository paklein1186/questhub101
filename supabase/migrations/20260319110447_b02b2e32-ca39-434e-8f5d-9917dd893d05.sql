
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'discover';
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS subtitle text;
