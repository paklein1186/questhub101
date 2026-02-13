
-- Tighten job_position_topics INSERT to verify user is company admin of the related job
DROP POLICY "Authenticated users can manage job topics" ON public.job_position_topics;
CREATE POLICY "Company admins can manage job topics"
  ON public.job_position_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_positions jp
      JOIN public.company_members cm ON cm.company_id = jp.company_id
      WHERE jp.id = job_position_topics.job_position_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );

DROP POLICY "Authenticated users can delete job topics" ON public.job_position_topics;
CREATE POLICY "Company admins can delete job topics"
  ON public.job_position_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_positions jp
      JOIN public.company_members cm ON cm.company_id = jp.company_id
      WHERE jp.id = job_position_topics.job_position_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );

-- Same for territories
DROP POLICY "Authenticated users can manage job territories" ON public.job_position_territories;
CREATE POLICY "Company admins can manage job territories"
  ON public.job_position_territories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_positions jp
      JOIN public.company_members cm ON cm.company_id = jp.company_id
      WHERE jp.id = job_position_territories.job_position_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );

DROP POLICY "Authenticated users can delete job territories" ON public.job_position_territories;
CREATE POLICY "Company admins can delete job territories"
  ON public.job_position_territories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_positions jp
      JOIN public.company_members cm ON cm.company_id = jp.company_id
      WHERE jp.id = job_position_territories.job_position_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner')
    )
  );
