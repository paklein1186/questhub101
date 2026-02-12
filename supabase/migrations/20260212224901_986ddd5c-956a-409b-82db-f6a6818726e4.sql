-- Allow pod hosts (not just creators) to update pod details
DROP POLICY IF EXISTS "Creators and admins can update pods" ON public.pods;
CREATE POLICY "Creators hosts and admins can update pods"
  ON public.pods FOR UPDATE
  USING (
    auth.uid() = creator_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = pods.id
        AND pm.user_id = auth.uid()
        AND pm.role = 'HOST'
    )
  );

-- Allow pod hosts to update member roles
CREATE POLICY "Hosts can update pod members"
  ON public.pod_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = pod_members.pod_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'HOST'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = pod_members.pod_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'HOST'
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow pod hosts to delete members (not just the member themselves)
DROP POLICY IF EXISTS "Members can leave or admins can manage" ON public.pod_members;
CREATE POLICY "Members can leave or hosts and admins can manage"
  ON public.pod_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.pod_members pm
      WHERE pm.pod_id = pod_members.pod_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'HOST'
    )
  );