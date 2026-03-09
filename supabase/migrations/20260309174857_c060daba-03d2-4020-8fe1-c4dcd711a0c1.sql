
CREATE POLICY "Stewards can update their territory"
  ON public.territories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trust_edges te
      WHERE te.from_node_id = auth.uid()
        AND te.to_node_id = territories.id
        AND te.to_node_type = 'territory'
        AND te.edge_type = 'stewardship'
        AND te.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trust_edges te
      WHERE te.from_node_id = auth.uid()
        AND te.to_node_id = territories.id
        AND te.to_node_type = 'territory'
        AND te.edge_type = 'stewardship'
        AND te.status = 'active'
    )
  );
