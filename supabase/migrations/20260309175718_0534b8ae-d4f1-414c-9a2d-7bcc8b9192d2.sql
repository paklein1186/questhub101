
CREATE OR REPLACE FUNCTION public.get_territory_ancestors(p_id uuid)
RETURNS TABLE (id uuid, name text, level text, slug text, depth int)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT t.id, t.name, t.level::text, t.slug, 0 AS depth, t.parent_id
    FROM territories t
    WHERE t.id = p_id
    UNION ALL
    SELECT t.id, t.name, t.level::text, t.slug, a.depth + 1, t.parent_id
    FROM territories t
    JOIN ancestors a ON t.id = a.parent_id
    WHERE a.parent_id IS NOT NULL AND a.depth < 6
  )
  SELECT id, name, level, slug, depth FROM ancestors
  WHERE id <> p_id
  ORDER BY depth DESC;
$$;
