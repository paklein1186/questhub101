
-- 1. Create natural_system_type enum
CREATE TYPE public.natural_system_type AS ENUM (
  'river', 'wetland', 'forest', 'soil_system', 'pollinator_network', 'species_guild', 'other'
);

-- 2. Create eco_category enum for quests
CREATE TYPE public.eco_category AS ENUM (
  'observation', 'restoration', 'governance', 'knowledge', 'none'
);

-- 3. Create natural_systems table
CREATE TABLE public.natural_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.natural_system_type NOT NULL DEFAULT 'other',
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  description TEXT,
  geo_shape JSONB,
  health_index INT DEFAULT 50 CHECK (health_index >= 0 AND health_index <= 100),
  resilience_index INT DEFAULT 50 CHECK (resilience_index >= 0 AND resilience_index <= 100),
  seasonal_cycle JSONB,
  stress_signals JSONB,
  regenerative_potential INT DEFAULT 50 CHECK (regenerative_potential >= 0 AND regenerative_potential <= 100),
  created_by_user_id UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add natural_system_id and eco_category to quests
ALTER TABLE public.quests
  ADD COLUMN natural_system_id UUID REFERENCES public.natural_systems(id) ON DELETE SET NULL,
  ADD COLUMN eco_category public.eco_category DEFAULT 'none';

-- 5. Add 'natural_system' to trust_node_type enum
ALTER TYPE public.trust_node_type ADD VALUE IF NOT EXISTS 'natural_system';

-- 6. RLS for natural_systems
ALTER TABLE public.natural_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view natural systems"
  ON public.natural_systems FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Authenticated users can create natural systems"
  ON public.natural_systems FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Creators can update their natural systems"
  ON public.natural_systems FOR UPDATE
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- 7. View: open_trust_edges (maps existing trust_edges to OTG format)
CREATE OR REPLACE VIEW public.open_trust_edges AS
SELECT
  te.id,
  te.from_node_type::text AS from_type,
  te.from_node_id::uuid AS from_id,
  te.to_node_type::text AS to_type,
  te.to_node_id::uuid AS to_id,
  te.edge_type::text AS edge_type,
  CASE
    WHEN te.score = 5 THEN 1.0
    WHEN te.score = 4 THEN 0.8
    WHEN te.score = 3 THEN 0.6
    WHEN te.score = 2 THEN 0.4
    WHEN te.score = 1 THEN 0.2
    ELSE 0.5
  END::float AS weight,
  CASE WHEN te.evidence_url IS NOT NULL THEN 1 ELSE 0 END AS evidence_count,
  te.updated_at AS last_updated_at,
  te.status::text,
  te.visibility::text,
  te.tags,
  te.context_territory_id,
  te.context_guild_id,
  te.context_quest_id
FROM public.trust_edges te
WHERE te.status = 'active';

-- 8. View: territory_natural_systems_summary
CREATE OR REPLACE VIEW public.territory_natural_systems_summary AS
SELECT
  ns.territory_id,
  COUNT(*)::int AS total_systems,
  ROUND(AVG(ns.health_index))::int AS avg_health_index,
  ROUND(AVG(ns.resilience_index))::int AS avg_resilience_index,
  ROUND(AVG(ns.regenerative_potential))::int AS avg_regenerative_potential,
  COUNT(*) FILTER (WHERE ns.type = 'river')::int AS river_count,
  COUNT(*) FILTER (WHERE ns.type = 'wetland')::int AS wetland_count,
  COUNT(*) FILTER (WHERE ns.type = 'forest')::int AS forest_count,
  COUNT(*) FILTER (WHERE ns.type = 'soil_system')::int AS soil_system_count,
  COUNT(*) FILTER (WHERE ns.type = 'pollinator_network')::int AS pollinator_network_count,
  COUNT(*) FILTER (WHERE ns.type = 'species_guild')::int AS species_guild_count,
  COUNT(*) FILTER (WHERE ns.type = 'other')::int AS other_count,
  (SELECT COUNT(*)::int FROM public.quests q WHERE q.natural_system_id = ANY(ARRAY_AGG(ns.id)) AND q.is_deleted = false) AS linked_quests_count
FROM public.natural_systems ns
WHERE ns.is_deleted = false
GROUP BY ns.territory_id;

-- 9. Function: top steward_of edges per territory
CREATE OR REPLACE FUNCTION public.get_territory_stewards(p_territory_id UUID, p_limit INT DEFAULT 10)
RETURNS TABLE (
  from_type TEXT,
  from_id UUID,
  to_type TEXT,
  to_id UUID,
  weight FLOAT,
  edge_type TEXT,
  tags TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    ote.from_type,
    ote.from_id,
    ote.to_type,
    ote.to_id,
    ote.weight,
    ote.edge_type,
    ote.tags
  FROM open_trust_edges ote
  WHERE ote.edge_type = 'stewardship'
    AND ote.visibility = 'public'
    AND (
      ote.context_territory_id = p_territory_id
      OR ote.to_id IN (SELECT id FROM natural_systems WHERE territory_id = p_territory_id AND is_deleted = false)
    )
  ORDER BY ote.weight DESC
  LIMIT p_limit;
$$;

-- 10. Indexes
CREATE INDEX idx_natural_systems_territory ON public.natural_systems(territory_id) WHERE is_deleted = false;
CREATE INDEX idx_quests_natural_system ON public.quests(natural_system_id) WHERE natural_system_id IS NOT NULL;
