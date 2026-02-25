
-- ═══════════════════════════════════════════════════════════
-- Territory OTG summary: top stewards + mini graph data
-- ═══════════════════════════════════════════════════════════

-- 1. Top stewards for a territory (users + guilds ranked by combined stewardship weight)
CREATE OR REPLACE FUNCTION public.get_territory_otg_stewards(
  p_territory_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  node_type TEXT,
  node_id UUID,
  node_name TEXT,
  node_avatar TEXT,
  total_weight FLOAT,
  edge_count INT,
  tags TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH steward_edges AS (
    SELECT
      te.from_node_type::text AS node_type,
      te.from_node_id::uuid AS node_id,
      te.score,
      te.tags
    FROM trust_edges te
    JOIN natural_systems ns ON ns.id = te.to_node_id::uuid AND ns.territory_id = p_territory_id AND ns.is_deleted = false
    WHERE te.to_node_type = 'natural_system'
      AND te.edge_type = 'stewardship'
      AND te.status = 'active'
      AND te.from_node_type IN ('profile', 'guild')
  ),
  ranked AS (
    SELECT
      se.node_type,
      se.node_id,
      SUM(CASE WHEN se.score = 5 THEN 1.0 WHEN se.score = 4 THEN 0.8 WHEN se.score = 3 THEN 0.6 WHEN se.score = 2 THEN 0.4 ELSE 0.2 END)::float AS total_weight,
      COUNT(*)::int AS edge_count,
      ARRAY(SELECT DISTINCT unnest FROM unnest(array_agg(se.tags)) WHERE unnest IS NOT NULL AND unnest != '' LIMIT 5) AS tags
    FROM steward_edges se
    GROUP BY se.node_type, se.node_id
    ORDER BY total_weight DESC
    LIMIT p_limit
  )
  SELECT
    r.node_type,
    r.node_id,
    CASE
      WHEN r.node_type = 'profile' THEN (SELECT p.name FROM profiles p WHERE p.user_id = r.node_id)
      WHEN r.node_type = 'guild' THEN (SELECT g.name FROM guilds g WHERE g.id = r.node_id)
      ELSE NULL
    END AS node_name,
    CASE
      WHEN r.node_type = 'profile' THEN (SELECT p.avatar_url FROM profiles p WHERE p.user_id = r.node_id)
      WHEN r.node_type = 'guild' THEN (SELECT g.logo_url FROM guilds g WHERE g.id = r.node_id)
      ELSE NULL
    END AS node_avatar,
    r.total_weight,
    r.edge_count,
    r.tags
  FROM ranked r;
$$;

-- 2. Mini graph data for territory OTG visualization
CREATE OR REPLACE FUNCTION public.get_territory_otg_graph(
  p_territory_id UUID,
  p_max_nodes INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _nodes JSONB := '[]'::jsonb;
  _edges JSONB := '[]'::jsonb;
  _ns RECORD;
  _edge RECORD;
  _seen_nodes JSONB := '{}'::jsonb;
  _territory_name TEXT;
BEGIN
  -- Territory center node
  SELECT name INTO _territory_name FROM territories WHERE id = p_territory_id;
  _nodes := _nodes || jsonb_build_array(jsonb_build_object(
    'id', p_territory_id,
    'type', 'territory',
    'name', COALESCE(_territory_name, 'Territory'),
    'is_center', true
  ));
  _seen_nodes := _seen_nodes || jsonb_build_object(p_territory_id::text, true);

  -- Natural systems in this territory
  FOR _ns IN
    SELECT id, name, type::text AS sys_type, health_index
    FROM natural_systems
    WHERE territory_id = p_territory_id AND is_deleted = false
    LIMIT p_max_nodes / 2
  LOOP
    _nodes := _nodes || jsonb_build_array(jsonb_build_object(
      'id', _ns.id,
      'type', 'natural_system',
      'name', _ns.name,
      'sys_type', _ns.sys_type,
      'health', _ns.health_index
    ));
    _seen_nodes := _seen_nodes || jsonb_build_object(_ns.id::text, true);

    -- Edge: territory → natural_system
    _edges := _edges || jsonb_build_array(jsonb_build_object(
      'source', p_territory_id,
      'target', _ns.id,
      'type', 'contains',
      'weight', 0.5
    ));
  END LOOP;

  -- Stewardship edges to natural systems in this territory
  FOR _edge IN
    SELECT
      te.from_node_type::text AS from_type,
      te.from_node_id::uuid AS from_id,
      te.to_node_id::uuid AS to_id,
      te.edge_type::text,
      CASE WHEN te.score = 5 THEN 1.0 WHEN te.score = 4 THEN 0.8 WHEN te.score = 3 THEN 0.6 WHEN te.score = 2 THEN 0.4 ELSE 0.2 END AS weight,
      CASE
        WHEN te.from_node_type = 'profile' THEN (SELECT p.name FROM profiles p WHERE p.user_id = te.from_node_id::uuid)
        WHEN te.from_node_type = 'guild' THEN (SELECT g.name FROM guilds g WHERE g.id = te.from_node_id::uuid)
        ELSE NULL
      END AS from_name,
      CASE
        WHEN te.from_node_type = 'profile' THEN (SELECT p.avatar_url FROM profiles p WHERE p.user_id = te.from_node_id::uuid)
        WHEN te.from_node_type = 'guild' THEN (SELECT g.logo_url FROM guilds g WHERE g.id = te.from_node_id::uuid)
        ELSE NULL
      END AS from_avatar
    FROM trust_edges te
    JOIN natural_systems ns ON ns.id = te.to_node_id::uuid AND ns.territory_id = p_territory_id
    WHERE te.to_node_type = 'natural_system'
      AND te.edge_type IN ('stewardship', 'collaboration')
      AND te.status = 'active'
      AND te.from_node_type IN ('profile', 'guild')
    ORDER BY weight DESC
    LIMIT p_max_nodes
  LOOP
    -- Add from node if not seen
    IF NOT (_seen_nodes ? _edge.from_id::text) THEN
      _nodes := _nodes || jsonb_build_array(jsonb_build_object(
        'id', _edge.from_id,
        'type', _edge.from_type,
        'name', COALESCE(_edge.from_name, 'Unknown'),
        'avatar', _edge.from_avatar
      ));
      _seen_nodes := _seen_nodes || jsonb_build_object(_edge.from_id::text, true);
    END IF;

    _edges := _edges || jsonb_build_array(jsonb_build_object(
      'source', _edge.from_id,
      'target', _edge.to_id,
      'type', _edge.edge_type,
      'weight', _edge.weight
    ));
  END LOOP;

  RETURN jsonb_build_object('nodes', _nodes, 'edges', _edges);
END;
$$;
