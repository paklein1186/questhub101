DROP POLICY "Company admins can insert job positions" ON public.job_positions;
CREATE POLICY "Company admins can insert job positions"
  ON public.job_positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = job_positions.company_id
        AND company_members.user_id = auth.uid()
        AND LOWER(company_members.role) IN ('admin', 'owner')
    )
  );

DROP POLICY "Company admins can update job positions" ON public.job_positions;
CREATE POLICY "Company admins can update job positions"
  ON public.job_positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = job_positions.company_id
        AND company_members.user_id = auth.uid()
        AND LOWER(company_members.role) IN ('admin', 'owner')
    )
  );

DROP POLICY "Company admins can delete job positions" ON public.job_positions;
CREATE POLICY "Company admins can delete job positions"
  ON public.job_positions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = job_positions.company_id
        AND company_members.user_id = auth.uid()
        AND LOWER(company_members.role) IN ('admin', 'owner')
    )
  );