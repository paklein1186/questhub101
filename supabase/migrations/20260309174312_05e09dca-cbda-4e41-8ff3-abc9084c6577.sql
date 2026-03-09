
DROP FUNCTION IF EXISTS public.get_territory_stewards(uuid, integer);

CREATE FUNCTION public.get_territory_stewards(p_territory_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE (
  from_id uuid,
  from_type text,
  edge_type text,
  weight integer,
  tags text[],
  status text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    te.from_node_id,
    te.from_node_type::text,
    te.edge_type::text,
    te.score,
    te.tags,
    te.status::text,
    te.created_at
  FROM public.trust_edges te
  WHERE te.to_node_id = p_territory_id
    AND te.to_node_type::text = 'territory'
    AND te.edge_type::text = 'stewardship'
    AND te.status::text = 'active'
  ORDER BY te.created_at ASC
  LIMIT p_limit;
$$;

CREATE INDEX IF NOT EXISTS idx_trust_edges_stewardship
  ON public.trust_edges (to_node_id, to_node_type, edge_type)
  WHERE edge_type = 'stewardship' AND status = 'active';
