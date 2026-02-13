
-- Job positions table
CREATE TABLE public.job_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  contract_type TEXT NOT NULL DEFAULT 'full-time',
  location_text TEXT,
  remote_policy TEXT DEFAULT 'on-site',
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT DEFAULT 'EUR',
  document_url TEXT,
  document_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job topics junction
CREATE TABLE public.job_position_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_position_id UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  UNIQUE(job_position_id, topic_id)
);

-- Job territories junction
CREATE TABLE public.job_position_territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_position_id UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  UNIQUE(job_position_id, territory_id)
);

-- Enable RLS
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_position_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_position_territories ENABLE ROW LEVEL SECURITY;

-- RLS for job_positions
CREATE POLICY "Anyone can view active job positions"
  ON public.job_positions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Company admins can insert job positions"
  ON public.job_positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = job_positions.company_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Company admins can update job positions"
  ON public.job_positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = job_positions.company_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Company admins can delete job positions"
  ON public.job_positions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_id = job_positions.company_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- RLS for job_position_topics
CREATE POLICY "Anyone can view job topics"
  ON public.job_position_topics FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage job topics"
  ON public.job_position_topics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete job topics"
  ON public.job_position_topics FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS for job_position_territories
CREATE POLICY "Anyone can view job territories"
  ON public.job_position_territories FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage job territories"
  ON public.job_position_territories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete job territories"
  ON public.job_position_territories FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Timestamps trigger
CREATE TRIGGER update_job_positions_updated_at
  BEFORE UPDATE ON public.job_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_job_positions_company ON public.job_positions(company_id);
CREATE INDEX idx_job_positions_active ON public.job_positions(is_active, created_at DESC);
CREATE INDEX idx_job_position_topics_job ON public.job_position_topics(job_position_id);
CREATE INDEX idx_job_position_territories_job ON public.job_position_territories(job_position_id);
