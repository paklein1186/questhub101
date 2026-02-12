-- Fix pod_members INSERT policy to allow pod hosts to invite members
CREATE POLICY "Users can join pods or hosts can invite"
ON public.pod_members
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.pod_members pm
    WHERE pm.pod_id = pod_members.pod_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'HOST'
  )
);