
-- Make company_id nullable to allow individual job posts
ALTER TABLE public.job_positions ALTER COLUMN company_id DROP NOT NULL;

-- Update INSERT policy to allow individuals to post jobs (no company required)
DROP POLICY IF EXISTS "Company admins can insert job positions" ON public.job_positions;
CREATE POLICY "Users can insert job positions"
  ON public.job_positions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND (
      company_id IS NULL
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE company_members.company_id = job_positions.company_id
          AND company_members.user_id = auth.uid()
          AND LOWER(company_members.role) IN ('admin', 'owner')
      )
    )
  );

-- Update UPDATE policy similarly
DROP POLICY IF EXISTS "Company admins can update job positions" ON public.job_positions;
CREATE POLICY "Users can update own job positions"
  ON public.job_positions FOR UPDATE
  USING (
    auth.uid() = created_by_user_id
    AND (
      company_id IS NULL
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE company_members.company_id = job_positions.company_id
          AND company_members.user_id = auth.uid()
          AND LOWER(company_members.role) IN ('admin', 'owner')
      )
    )
  );

-- Update DELETE policy similarly
DROP POLICY IF EXISTS "Company admins can delete job positions" ON public.job_positions;
CREATE POLICY "Users can delete own job positions"
  ON public.job_positions FOR DELETE
  USING (
    auth.uid() = created_by_user_id
    AND (
      company_id IS NULL
      OR EXISTS (
        SELECT 1 FROM company_members
        WHERE company_members.company_id = job_positions.company_id
          AND company_members.user_id = auth.uid()
          AND LOWER(company_members.role) IN ('admin', 'owner')
      )
    )
  );
