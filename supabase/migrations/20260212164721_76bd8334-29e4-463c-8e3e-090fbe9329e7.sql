-- Allow admins to hard-delete records from key tables

CREATE POLICY "Admins can delete guilds"
ON public.guilds FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete companies"
ON public.companies FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quests"
ON public.quests FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pods"
ON public.pods FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));