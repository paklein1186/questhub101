
-- Table to store per-service visibility overrides for company service display
CREATE TABLE public.company_service_visibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, service_id)
);

-- Enable RLS
ALTER TABLE public.company_service_visibility ENABLE ROW LEVEL SECURITY;

-- Company admins can manage visibility
CREATE POLICY "Company admins can view visibility settings"
  ON public.company_service_visibility FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_service_visibility.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner', 'ADMIN')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company admins can insert visibility settings"
  ON public.company_service_visibility FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_service_visibility.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner', 'ADMIN')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company admins can update visibility settings"
  ON public.company_service_visibility FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_service_visibility.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner', 'ADMIN')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Company admins can delete visibility settings"
  ON public.company_service_visibility FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_service_visibility.company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'owner', 'ADMIN')
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_company_service_visibility_updated_at
  BEFORE UPDATE ON public.company_service_visibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
