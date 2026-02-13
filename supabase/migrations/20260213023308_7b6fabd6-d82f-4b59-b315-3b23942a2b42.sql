-- Allow job creators to update their own job positions (needed for soft-delete)
CREATE POLICY "Job creators can update own positions"
  ON public.job_positions
  FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());