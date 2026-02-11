-- Create company_topics junction table for House-based filtering
CREATE TABLE public.company_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  UNIQUE(company_id, topic_id)
);

-- Enable RLS
ALTER TABLE public.company_topics ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view company topics"
  ON public.company_topics FOR SELECT USING (true);

-- Company admins can manage
CREATE POLICY "Company admins can insert topics"
  ON public.company_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_topics.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Company admins can delete topics"
  ON public.company_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = company_topics.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role IN ('admin', 'owner')
    )
  );

-- Indexes
CREATE INDEX idx_company_topics_company ON public.company_topics(company_id);
CREATE INDEX idx_company_topics_topic ON public.company_topics(topic_id);
