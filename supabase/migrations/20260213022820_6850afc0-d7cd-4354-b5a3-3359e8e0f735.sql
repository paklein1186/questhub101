
-- RLS policies for job_position_topics
ALTER TABLE public.job_position_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read job position topics"
  ON public.job_position_topics FOR SELECT
  USING (true);

CREATE POLICY "Job creators can insert topics"
  ON public.job_position_topics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_positions
      WHERE job_positions.id = job_position_topics.job_position_id
        AND job_positions.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Job creators can delete topics"
  ON public.job_position_topics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_positions
      WHERE job_positions.id = job_position_topics.job_position_id
        AND job_positions.created_by_user_id = auth.uid()
    )
  );

-- RLS policies for job_position_territories
ALTER TABLE public.job_position_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read job position territories"
  ON public.job_position_territories FOR SELECT
  USING (true);

CREATE POLICY "Job creators can insert territories"
  ON public.job_position_territories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM job_positions
      WHERE job_positions.id = job_position_territories.job_position_id
        AND job_positions.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Job creators can delete territories"
  ON public.job_position_territories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM job_positions
      WHERE job_positions.id = job_position_territories.job_position_id
        AND job_positions.created_by_user_id = auth.uid()
    )
  );
