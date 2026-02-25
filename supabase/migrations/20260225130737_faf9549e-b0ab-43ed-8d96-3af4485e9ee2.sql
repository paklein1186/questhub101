
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

  -- Link territories via quest_territories junction table
  INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
  SELECT NEW.natural_system_id, 'territory', qt.territory_id, 'quest'
  FROM quest_territories qt
  WHERE qt.quest_id = NEW.id
  ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_auto_link_quest_ns ON public.quests;
CREATE TRIGGER trg_auto_link_quest_ns
  AFTER INSERT OR UPDATE OF natural_system_id ON public.quests
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_quest_natural_system();

-- Also add a trigger on quest_territories to propagate territory links
-- when a territory is associated with a quest that already has a natural_system_id
CREATE OR REPLACE FUNCTION public.auto_link_quest_territory_ns()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _ns_id UUID;
BEGIN
  SELECT natural_system_id INTO _ns_id FROM quests WHERE id = NEW.quest_id;
  IF _ns_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
  VALUES (_ns_id, 'territory', NEW.territory_id, 'quest')
  ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_quest_territory_ns ON public.quest_territories;
CREATE TRIGGER trg_auto_link_quest_territory_ns
  AFTER INSERT ON public.quest_territories
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_quest_territory_ns();
