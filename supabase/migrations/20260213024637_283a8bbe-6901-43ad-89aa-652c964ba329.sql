-- Drop the restrictive SELECT policy and replace with one that also lets authors see their own posts
DROP POLICY "Anyone can view active job positions" ON public.job_positions;

CREATE POLICY "Anyone can view active job positions or own"
ON public.job_positions
FOR SELECT
USING (is_active = true OR created_by_user_id = auth.uid());