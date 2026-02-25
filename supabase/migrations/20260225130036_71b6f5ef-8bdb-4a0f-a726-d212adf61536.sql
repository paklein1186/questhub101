
-- 1. Create enums for kingdom and new system_type
CREATE TYPE public.natural_system_kingdom AS ENUM (
  'plants', 'animals', 'fungi_lichens', 'microorganisms', 'multi_species_guild'
);

CREATE TYPE public.natural_system_type_v2 AS ENUM (
  'river_watershed', 'wetland_peatland', 'forest_woodland', 'soil_system_agroecosystem',
  'grassland_meadow', 'urban_ecosystem', 'mountain_slope', 'coastline_estuary',
  'aquifer_spring', 'climate_cell', 'other'
);

CREATE TYPE public.ns_link_type AS ENUM ('user', 'entity', 'territory', 'quest');
CREATE TYPE public.ns_link_via AS ENUM ('quest', 'manual');

-- 2. Alter natural_systems: add new columns, make territory_id nullable
ALTER TABLE public.natural_systems
  ADD COLUMN IF NOT EXISTS kingdom public.natural_system_kingdom NOT NULL DEFAULT 'plants',
  ADD COLUMN IF NOT EXISTS system_type public.natural_system_type_v2 NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS picture_url text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

ALTER TABLE public.natural_systems ALTER COLUMN territory_id DROP NOT NULL;

-- 3. Create natural_system_links table
CREATE TABLE public.natural_system_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  natural_system_id uuid NOT NULL REFERENCES public.natural_systems(id) ON DELETE CASCADE,
  linked_type public.ns_link_type NOT NULL,
  linked_id uuid NOT NULL,
  linked_via public.ns_link_via NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (natural_system_id, linked_type, linked_id)
);

CREATE INDEX idx_ns_links_system ON public.natural_system_links(natural_system_id);
CREATE INDEX idx_ns_links_target ON public.natural_system_links(linked_type, linked_id);

-- 4. RLS on natural_system_links
ALTER TABLE public.natural_system_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read natural_system_links"
  ON public.natural_system_links FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert natural_system_links"
  ON public.natural_system_links FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete own links"
  ON public.natural_system_links FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- 5. RLS on natural_systems (ensure public read)
CREATE POLICY "Anyone can read natural_systems" ON public.natural_systems FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert natural_systems" ON public.natural_systems;
CREATE POLICY "Authenticated users can insert natural_systems"
  ON public.natural_systems FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update natural_systems" ON public.natural_systems;
CREATE POLICY "Authenticated users can update natural_systems"
  ON public.natural_systems FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 6. Trigger: auto-link when quest has natural_system_id
CREATE OR REPLACE FUNCTION public.auto_link_quest_natural_system()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.natural_system_id IS NULL THEN RETURN NEW; END IF;

  -- Link quest
  INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
  VALUES (NEW.natural_system_id, 'quest', NEW.id, 'quest')
  ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;

  -- Link quest creator
  IF NEW.created_by_user_id IS NOT NULL THEN
    INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    VALUES (NEW.natural_system_id, 'user', NEW.created_by_user_id, 'quest')
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
  END IF;

  -- Link guild/entity
  IF NEW.guild_id IS NOT NULL THEN
    INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    VALUES (NEW.natural_system_id, 'entity', NEW.guild_id, 'quest')
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
  END IF;

  -- Link company
  IF NEW.company_id IS NOT NULL THEN
    INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    VALUES (NEW.natural_system_id, 'entity', NEW.company_id, 'quest')
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_quest_ns ON public.quests;
CREATE TRIGGER trg_auto_link_quest_ns
  AFTER INSERT OR UPDATE OF natural_system_id ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_quest_natural_system();

-- 7. RPCs

-- Fetch all natural systems linked to a unit
CREATE OR REPLACE FUNCTION public.get_linked_natural_systems(
  p_linked_type public.ns_link_type,
  p_linked_id uuid
)
RETURNS TABLE (
  id uuid, name text, kingdom public.natural_system_kingdom,
  system_type public.natural_system_type_v2,
  territory_id uuid, location_text text, description text,
  picture_url text, source_url text, tags text[],
  health_index int, resilience_index int, regenerative_potential int,
  linked_via public.ns_link_via, link_created_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    ns.id, ns.name, ns.kingdom, ns.system_type,
    ns.territory_id, ns.location_text, ns.description,
    ns.picture_url, ns.source_url, ns.tags,
    ns.health_index, ns.resilience_index, ns.regenerative_potential,
    nsl.linked_via, nsl.created_at AS link_created_at,
    ns.created_at, ns.updated_at
  FROM natural_system_links nsl
  JOIN natural_systems ns ON ns.id = nsl.natural_system_id AND ns.is_deleted = false
  WHERE nsl.linked_type = p_linked_type AND nsl.linked_id = p_linked_id
  ORDER BY ns.name;
$$;

-- Create a natural system and link it to a unit
CREATE OR REPLACE FUNCTION public.create_and_link_natural_system(
  p_name text,
  p_kingdom public.natural_system_kingdom,
  p_system_type public.natural_system_type_v2,
  p_description text DEFAULT '',
  p_territory_id uuid DEFAULT NULL,
  p_location_text text DEFAULT NULL,
  p_picture_url text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_tags text[] DEFAULT '{}',
  p_linked_type public.ns_link_type DEFAULT NULL,
  p_linked_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _ns_id uuid;
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO natural_systems (name, kingdom, system_type, description, territory_id, location_text, picture_url, source_url, tags, created_by_user_id)
  VALUES (p_name, p_kingdom, p_system_type, p_description, p_territory_id, p_location_text, p_picture_url, p_source_url, p_tags, _user_id)
  RETURNING id INTO _ns_id;

  IF p_linked_type IS NOT NULL AND p_linked_id IS NOT NULL THEN
    INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    VALUES (_ns_id, p_linked_type, p_linked_id, 'manual')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _ns_id;
END;
$$;

-- Link an existing natural system to a unit
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
END;
$$;
