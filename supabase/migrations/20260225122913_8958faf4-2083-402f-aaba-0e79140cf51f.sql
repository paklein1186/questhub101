
-- Fix security definer views by setting security_invoker = true
CREATE OR REPLACE VIEW public.open_trust_edges WITH (security_invoker = true) AS
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

CREATE OR REPLACE VIEW public.territory_natural_systems_summary WITH (security_invoker = true) AS
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

-- Tighten INSERT policy to set created_by_user_id
DROP POLICY "Authenticated users can create natural systems" ON public.natural_systems;
CREATE POLICY "Authenticated users can create natural systems"
  ON public.natural_systems FOR INSERT
  TO authenticated
  WITH CHECK (created_by_user_id = auth.uid());
