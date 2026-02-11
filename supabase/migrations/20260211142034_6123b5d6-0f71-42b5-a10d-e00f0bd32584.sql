
-- 1. Add quality & usage metadata columns to territory_memory
ALTER TABLE public.territory_memory
  ADD COLUMN IF NOT EXISTS is_included_in_summary boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_score numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS human_score numeric,
  ADD COLUMN IF NOT EXISTS used_in_last_summary_at timestamptz;

-- 2. Create territory_summaries table
CREATE TABLE public.territory_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  summary_type text NOT NULL DEFAULT 'OVERVIEW',
  content text NOT NULL DEFAULT '',
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by text NOT NULL DEFAULT 'AI',
  based_on_memory_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_territory_summaries_territory ON public.territory_summaries(territory_id, summary_type);

-- Enable RLS
ALTER TABLE public.territory_summaries ENABLE ROW LEVEL SECURITY;

-- Everyone can read summaries
CREATE POLICY "Anyone can read territory summaries"
  ON public.territory_summaries FOR SELECT
  TO authenticated
  USING (true);

-- Territory members can insert/update summaries
CREATE POLICY "Territory members can manage summaries"
  ON public.territory_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_territories ut
      WHERE ut.territory_id = territory_summaries.territory_id
      AND ut.user_id = auth.uid()
    )
  );

CREATE POLICY "Territory members can update summaries"
  ON public.territory_summaries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_territories ut
      WHERE ut.territory_id = territory_summaries.territory_id
      AND ut.user_id = auth.uid()
    )
  );

-- Service role can manage all summaries (for edge functions)
CREATE POLICY "Service role manages summaries"
  ON public.territory_summaries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_territory_summaries_updated_at
  BEFORE UPDATE ON public.territory_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
