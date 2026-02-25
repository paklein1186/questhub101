
-- ═══════════════════════════════════════════════════════════
-- 1. Add idempotency tracking for eco quest OTG updates
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.quests
  ADD COLUMN IF NOT EXISTS otg_edges_created BOOLEAN NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════
-- 2. Core: increment/upsert a trust edge (stewardship)
-- Uses existing trust_edges table, not a separate table
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.upsert_stewardship_edge(
  _from_type public.trust_node_type,
  _from_id UUID,
  _to_type public.trust_node_type,
  _to_id UUID,
  _edge_type public.trust_edge_type DEFAULT 'stewardship',
  _delta_score NUMERIC DEFAULT 0.2,
  _context_quest_id UUID DEFAULT NULL,
  _context_territory_id UUID DEFAULT NULL,
  _context_guild_id UUID DEFAULT NULL,
  _created_by UUID DEFAULT NULL,
  _tags TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _existing RECORD;
  _new_score NUMERIC;
  _edge_id UUID;
BEGIN
  -- Find existing active edge between these nodes with same type
  SELECT id, score INTO _existing
  FROM trust_edges
  WHERE from_node_type = _from_type
    AND from_node_id = _from_id::text
    AND to_node_type = _to_type
    AND to_node_id = _to_id::text
    AND edge_type = _edge_type
    AND status = 'active'
  LIMIT 1;

  IF _existing IS NOT NULL THEN
    -- Increment score (capped at 5)
    _new_score := LEAST(5, _existing.score + _delta_score);
    
    UPDATE trust_edges
    SET score = _new_score,
        last_confirmed_at = now(),
        updated_at = now(),
        -- Merge tags
        tags = (
          SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(COALESCE(tags, '{}') || _tags))
        )
    WHERE id = _existing.id;
    
    _edge_id := _existing.id;
  ELSE
    -- Create new edge
    _new_score := LEAST(5, GREATEST(1, _delta_score * 5));
    
    INSERT INTO trust_edges (
      from_node_type, from_node_id,
      to_node_type, to_node_id,
      edge_type, score, status, visibility,
      created_by,
      context_quest_id, context_territory_id, context_guild_id,
      tags, last_confirmed_at, note
    ) VALUES (
      _from_type, _from_id::text,
      _to_type, _to_id::text,
      _edge_type, _new_score, 'active', 'public',
      COALESCE(_created_by, _from_id),
      _context_quest_id, _context_territory_id, _context_guild_id,
      _tags, now(), 'Auto-generated from ecological quest completion'
    )
    RETURNING id INTO _edge_id;
  END IF;

  RETURN _edge_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 3. OTG edge creation on eco quest completion
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_eco_quest_otg_edges(_quest_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _quest RECORD;
  _system RECORD;
  _participant RECORD;
  _territory_id UUID;
BEGIN
  -- Load quest (with idempotency check)
  SELECT q.id, q.natural_system_id, q.eco_category, q.guild_id, q.otg_edges_created
  INTO _quest
  FROM quests q WHERE q.id = _quest_id;

  IF _quest IS NULL OR _quest.natural_system_id IS NULL THEN RETURN; END IF;
  IF _quest.otg_edges_created THEN RETURN; END IF; -- Idempotency guard

  -- Load natural system
  SELECT ns.id, ns.territory_id
  INTO _system
  FROM natural_systems ns WHERE ns.id = _quest.natural_system_id AND ns.is_deleted = false;

  IF _system IS NULL THEN RETURN; END IF;
  _territory_id := _system.territory_id;

  -- ── A. User → Natural System (steward_of) for each participant ──
  FOR _participant IN
    SELECT user_id FROM quest_participants WHERE quest_id = _quest_id
  LOOP
    PERFORM upsert_stewardship_edge(
      'profile'::trust_node_type, _participant.user_id,
      'natural_system'::trust_node_type, _quest.natural_system_id,
      'stewardship'::trust_edge_type, 0.2,
      _quest_id, _territory_id, _quest.guild_id,
      _participant.user_id,
      ARRAY[COALESCE(_quest.eco_category::text, 'ecological')]
    );
  END LOOP;

  -- ── B. Guild → Natural System (steward_of) if quest has a guild ──
  IF _quest.guild_id IS NOT NULL THEN
    PERFORM upsert_stewardship_edge(
      'guild'::trust_node_type, _quest.guild_id,
      'natural_system'::trust_node_type, _quest.natural_system_id,
      'stewardship'::trust_edge_type, 0.15,
      _quest_id, _territory_id, _quest.guild_id,
      NULL,
      ARRAY['guild_stewardship', COALESCE(_quest.eco_category::text, 'ecological')]
    );
  END IF;

  -- ── C. Territory → Guild (trusts) if quest has guild and territory ──
  IF _quest.guild_id IS NOT NULL AND _territory_id IS NOT NULL THEN
    -- Count completed eco quests for this guild+territory pair
    DECLARE
      _completed_count INT;
    BEGIN
      SELECT COUNT(*)::int INTO _completed_count
      FROM quests q
      JOIN natural_systems ns ON ns.id = q.natural_system_id
      WHERE q.guild_id = _quest.guild_id
        AND ns.territory_id = _territory_id
        AND q.status = 'COMPLETED'
        AND q.is_deleted = false;

      -- Only create territory→guild trust after 3+ completed quests
      IF _completed_count >= 3 THEN
        PERFORM upsert_stewardship_edge(
          'territory'::trust_node_type, _territory_id,
          'guild'::trust_node_type, _quest.guild_id,
          'collaboration'::trust_edge_type, 0.1,
          _quest_id, _territory_id, _quest.guild_id,
          NULL,
          ARRAY['territory_trusts_guild', 'ecological']
        );
      END IF;
    END;
  END IF;

  -- Mark idempotency flag
  UPDATE quests SET otg_edges_created = true WHERE id = _quest_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. Update the eco quest completion trigger to also create OTG edges
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_eco_quest_completed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    IF NEW.natural_system_id IS NOT NULL AND NEW.eco_category IS NOT NULL AND NEW.eco_category::text != 'none' THEN
      -- Distribute rewards
      PERFORM distribute_eco_quest_rewards(NEW.id);
      -- Create OTG edges
      PERFORM create_eco_quest_otg_edges(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
