
-- Step 1: Drop all objects that depend on ns_link_via
DROP POLICY IF EXISTS "Authenticated users can insert manual links" ON public.natural_system_links;
DROP POLICY IF EXISTS "Users can delete manual links they're involved in" ON public.natural_system_links;
DROP FUNCTION IF EXISTS public.get_linked_natural_systems(ns_link_type, uuid);

-- Step 2: Convert linked_via from enum to text
ALTER TABLE public.natural_system_links ALTER COLUMN linked_via DROP DEFAULT;
ALTER TABLE public.natural_system_links ALTER COLUMN linked_via TYPE text USING linked_via::text;
ALTER TABLE public.natural_system_links ALTER COLUMN linked_via SET DEFAULT 'manual';

-- Step 3: Drop the enum
DROP TYPE IF EXISTS public.ns_link_via;

-- Step 4: Recreate policies
CREATE POLICY "Authenticated users can insert manual links"
  ON public.natural_system_links FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND linked_via = 'manual');

CREATE POLICY "Users can delete manual links they're involved in"
  ON public.natural_system_links FOR DELETE
  USING (auth.uid() IS NOT NULL AND linked_via = 'manual');

-- Step 5: Recreate get_linked_natural_systems
CREATE OR REPLACE FUNCTION public.get_linked_natural_systems(p_linked_type ns_link_type, p_linked_id uuid)
RETURNS TABLE(
  id uuid, name text, kingdom text, system_type text,
  territory_id uuid, location_text text, description text,
  picture_url text, source_url text, tags text[],
  health_index numeric, resilience_index numeric, regenerative_potential numeric,
  linked_via text, link_created_at timestamptz,
  created_at timestamptz, updated_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ns.id, ns.name, ns.kingdom::text, ns.system_type,
    ns.territory_id, ns.location_text, ns.description,
    ns.picture_url, ns.source_url, ns.tags,
    ns.health_index, ns.resilience_index, ns.regenerative_potential,
    nsl.linked_via, nsl.created_at,
    ns.created_at, ns.updated_at
  FROM natural_system_links nsl
  JOIN natural_systems ns ON ns.id = nsl.natural_system_id AND ns.is_deleted = false
  WHERE nsl.linked_type = p_linked_type AND nsl.linked_id = p_linked_id
  ORDER BY ns.name;
$$;

-- Step 6: Create propagation triggers
CREATE OR REPLACE FUNCTION public.propagate_ns_link_to_ancestors()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.linked_type = 'territory'::ns_link_type THEN
    INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    SELECT NEW.natural_system_id, 'territory'::ns_link_type, tc.ancestor_id, 'territory_hierarchy'
    FROM public.territory_closure tc
    WHERE tc.descendant_id = NEW.linked_id AND tc.depth > 0
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_propagate_ns_link_ancestors
  AFTER INSERT ON public.natural_system_links
  FOR EACH ROW
  WHEN (NEW.linked_type = 'territory')
  EXECUTE FUNCTION public.propagate_ns_link_to_ancestors();

CREATE OR REPLACE FUNCTION public.propagate_ns_territory_to_ancestors()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.territory_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.territory_id IS DISTINCT FROM NEW.territory_id) THEN
    INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    VALUES (NEW.id, 'territory'::ns_link_type, NEW.territory_id, 'manual')
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
    INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    SELECT NEW.id, 'territory'::ns_link_type, tc.ancestor_id, 'territory_hierarchy'
    FROM public.territory_closure tc
    WHERE tc.descendant_id = NEW.territory_id AND tc.depth > 0
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_propagate_ns_territory_ancestors
  AFTER INSERT OR UPDATE OF territory_id ON public.natural_systems
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_ns_territory_to_ancestors();

-- Step 7: Backfill existing territory links to ancestors
INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
SELECT DISTINCT nsl.natural_system_id, 'territory'::ns_link_type, tc.ancestor_id, 'territory_hierarchy'
FROM public.natural_system_links nsl
JOIN public.territory_closure tc ON tc.descendant_id = nsl.linked_id AND tc.depth > 0
WHERE nsl.linked_type = 'territory'
ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;

INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
SELECT DISTINCT ns.id, 'territory'::ns_link_type, tc.ancestor_id, 'territory_hierarchy'
FROM public.natural_systems ns
JOIN public.territory_closure tc ON tc.descendant_id = ns.territory_id AND tc.depth > 0
WHERE ns.territory_id IS NOT NULL AND ns.is_deleted = false
ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
