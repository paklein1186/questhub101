
-- Fix: replace the permissive ALL policy with specific operation policies
DROP POLICY IF EXISTS "Admins can manage cooperative settings" ON public.cooperative_settings;

CREATE POLICY "Admins can insert cooperative settings"
ON public.cooperative_settings FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins can update cooperative settings"
ON public.cooperative_settings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins can delete cooperative settings"
ON public.cooperative_settings FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin'))
);
