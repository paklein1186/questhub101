
-- Fix: link_natural_system should also set territory_id when linking to territory
CREATE OR REPLACE FUNCTION public.link_natural_system(
  p_natural_system_id uuid,
  p_linked_type public.ns_link_type,
  p_linked_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
  VALUES (p_natural_system_id, p_linked_type, p_linked_id, 'manual')
  ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;

  -- Also set territory_id on the natural system if linking to a territory
  IF p_linked_type = 'territory' THEN
    UPDATE natural_systems
    SET territory_id = p_linked_id
    WHERE id = p_natural_system_id
      AND (territory_id IS NULL OR territory_id != p_linked_id);
  END IF;
END;
$$;

-- Fix: get_territory_natural_systems should also return systems linked via natural_system_links
CREATE OR REPLACE FUNCTION public.get_territory_natural_systems(p_territory_id uuid)
RETURNS TABLE(
  id uuid, name text,
  kingdom text, system_type text,
  health_index integer, resilience_index integer, regenerative_potential integer,
  picture_url text, description text,
  tags text[], location_text text, source_url text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (ns.id)
    ns.id, ns.name,
    ns.kingdom::text, ns.system_type::text,
    ns.health_index, ns.resilience_index, ns.regenerative_potential,
    ns.picture_url,
    LEFT(ns.description, 300) AS description,
    ns.tags, ns.location_text, ns.source_url, ns.created_at
  FROM natural_systems ns
  WHERE ns.is_deleted = false
    AND (
      ns.territory_id = p_territory_id
      OR ns.id IN (
        SELECT nsl.natural_system_id FROM natural_system_links nsl
        WHERE nsl.linked_type = 'territory' AND nsl.linked_id = p_territory_id
      )
    )
  ORDER BY ns.id, ns.health_index ASC, ns.name;
$$;
