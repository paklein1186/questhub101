-- Add synthesis and source_prompt columns to territory_excerpts
ALTER TABLE public.territory_excerpts
  ADD COLUMN IF NOT EXISTS synthesis TEXT,
  ADD COLUMN IF NOT EXISTS source_prompt TEXT;

-- Create territory_excerpt_reports table for reporting excerpts to admins
CREATE TABLE IF NOT EXISTS public.territory_excerpt_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  excerpt_id UUID NOT NULL REFERENCES public.territory_excerpts(id) ON DELETE CASCADE,
  reported_by_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  custom_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.territory_excerpt_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can report excerpts"
  ON public.territory_excerpt_reports FOR INSERT
  WITH CHECK (auth.uid() = reported_by_user_id);

-- Users can see their own reports
CREATE POLICY "Users can view own reports"
  ON public.territory_excerpt_reports FOR SELECT
  USING (auth.uid() = reported_by_user_id);

-- Add is_deleted column for soft delete
ALTER TABLE public.territory_excerpts
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
