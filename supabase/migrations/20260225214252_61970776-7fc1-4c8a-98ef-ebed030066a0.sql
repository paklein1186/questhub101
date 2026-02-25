
-- Function 1: Get linked natural systems with co-dependency propagation
CREATE OR REPLACE FUNCTION public.get_linked_natural_systems_with_codeps(
  p_linked_type text,
  p_linked_id uuid
)
RETURNS TABLE(
  id uuid,
  name text,
  kingdom text,
  system_type text,
  territory_id uuid,
  location_text text,
  description text,
  picture_url text,
  source_url text,
  tags text[],
  health_index integer,
  resilience_index integer,
  regenerative_potential integer,
  linked_via text,
  link_created_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  codep_source text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH direct_links AS (
    SELECT nsl.natural_system_id, nsl.linked_via::text, nsl.created_at AS link_created_at, 'direct' AS codep_source
    FROM natural_system_links nsl
    WHERE nsl.linked_type::text = p_linked_type AND nsl.linked_id = p_linked_id
  ),
  member_user_links AS (
    SELECT DISTINCT nsl.natural_system_id, nsl.linked_via::text, nsl.created_at AS link_created_at, 'member_user' AS codep_source
    FROM natural_system_links nsl
    WHERE nsl.linked_type::text = 'user'
      AND p_linked_type = 'entity'
      AND nsl.linked_id IN (
        SELECT gm.user_id FROM guild_members gm WHERE gm.guild_id = p_linked_id
        UNION
        SELECT cm.user_id FROM company_members cm WHERE cm.company_id = p_linked_id
        UNION
        SELECT pm.user_id FROM pod_members pm WHERE pm.pod_id = p_linked_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM direct_links dl WHERE dl.natural_system_id = nsl.natural_system_id
      )
  ),
  member_quest_links AS (
    SELECT DISTINCT nsl.natural_system_id, nsl.linked_via::text, nsl.created_at AS link_created_at, 'member_quest' AS codep_source
    FROM natural_system_links nsl
    WHERE nsl.linked_type::text = 'quest'
      AND p_linked_type = 'user'
      AND nsl.linked_id IN (
        SELECT qp.quest_id FROM quest_participants qp WHERE qp.user_id = p_linked_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM direct_links dl WHERE dl.natural_system_id = nsl.natural_system_id
      )
  ),
  all_links AS (
    SELECT * FROM direct_links
    UNION ALL
    SELECT * FROM member_user_links
    UNION ALL
    SELECT * FROM member_quest_links
  ),
  deduped AS (
    SELECT DISTINCT ON (al.natural_system_id) al.*
    FROM all_links al
    ORDER BY al.natural_system_id, 
      CASE al.codep_source WHEN 'direct' THEN 0 WHEN 'member_user' THEN 1 ELSE 2 END
  )
  SELECT
    ns.id, ns.name, ns.kingdom::text, ns.system_type::text, ns.territory_id,
    ns.location_text, ns.description, ns.picture_url, ns.source_url, ns.tags,
    ns.health_index, ns.resilience_index, ns.regenerative_potential,
    d.linked_via, d.link_created_at, ns.created_at, ns.updated_at,
    d.codep_source
  FROM deduped d
  JOIN natural_systems ns ON ns.id = d.natural_system_id AND ns.is_deleted = false
  ORDER BY d.codep_source, ns.name;
$$;

-- Function 2: Get co-occurring natural systems (galaxy)
CREATE OR REPLACE FUNCTION public.get_co_occurring_natural_systems(p_natural_system_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  kingdom text,
  system_type text,
  picture_url text,
  health_index integer,
  shared_links_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH my_links AS (
    SELECT linked_type::text AS lt, linked_id
    FROM natural_system_links
    WHERE natural_system_id = p_natural_system_id
  ),
  co_links AS (
    SELECT nsl.natural_system_id, count(*) AS shared_count
    FROM natural_system_links nsl
    JOIN my_links ml ON ml.lt = nsl.linked_type::text AND ml.linked_id = nsl.linked_id
    WHERE nsl.natural_system_id != p_natural_system_id
    GROUP BY nsl.natural_system_id
  )
  SELECT
    ns.id, ns.name, ns.kingdom::text, ns.system_type::text, ns.picture_url,
    ns.health_index, cl.shared_count AS shared_links_count
  FROM co_links cl
  JOIN natural_systems ns ON ns.id = cl.natural_system_id AND ns.is_deleted = false
  ORDER BY cl.shared_count DESC, ns.name
  LIMIT 50;
$$;
