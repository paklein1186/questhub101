-- Suppression d'un agent par ceux qui le gèrent (créateur ou admin de la guilde propriétaire).
CREATE POLICY "Managers delete agents" ON public.agents FOR DELETE TO authenticated
USING (public.can_manage_agent(id, auth.uid()));