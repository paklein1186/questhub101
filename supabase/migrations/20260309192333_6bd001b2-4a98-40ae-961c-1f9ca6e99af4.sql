
CREATE TABLE public.stewardship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by_user_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stewardship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
  ON public.stewardship_requests FOR SELECT TO authenticated
  USING (requester_user_id = auth.uid());

CREATE POLICY "Stewards can view territory requests"
  ON public.stewardship_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trust_edges te
      WHERE te.from_node_id = auth.uid()
        AND te.to_node_id = stewardship_requests.territory_id
        AND te.edge_type = 'stewardship'
        AND te.status = 'active'
    )
  );

CREATE POLICY "Users can create requests"
  ON public.stewardship_requests FOR INSERT TO authenticated
  WITH CHECK (requester_user_id = auth.uid());

CREATE POLICY "Stewards can update requests"
  ON public.stewardship_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trust_edges te
      WHERE te.from_node_id = auth.uid()
        AND te.to_node_id = stewardship_requests.territory_id
        AND te.edge_type = 'stewardship'
        AND te.status = 'active'
    )
  );
