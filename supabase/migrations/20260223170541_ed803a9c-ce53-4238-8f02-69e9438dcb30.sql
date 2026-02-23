
-- ═══ 1. Validation trigger: rate limits & reciprocal XP halving ═══
CREATE OR REPLACE FUNCTION public.validate_trust_edge_constraints()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _public_this_week INTEGER;
  _pair_recent INTEGER;
  _reciprocal_recent BOOLEAN;
BEGIN
  -- ── Constraint 1: Max 3 public TrustEdges per user per week ──
  IF NEW.visibility = 'public' AND NEW.from_node_type = 'profile' THEN
    SELECT count(*) INTO _public_this_week
    FROM trust_edges
    WHERE created_by = NEW.created_by
      AND visibility = 'public'
      AND created_at >= date_trunc('week', now());

    IF _public_this_week >= 3 THEN
      RAISE EXCEPTION 'TRUST_LIMIT_PUBLIC_WEEKLY:You can create at most 3 public trust attestations per week. Please wait until next week or use network/private visibility.';
    END IF;
  END IF;

  -- ── Constraint 2: Max 1 TrustEdge between same two nodes every 6 months ──
  SELECT count(*) INTO _pair_recent
  FROM trust_edges
  WHERE from_node_type = NEW.from_node_type
    AND from_node_id = NEW.from_node_id
    AND to_node_type = NEW.to_node_type
    AND to_node_id = NEW.to_node_id
    AND edge_type = NEW.edge_type
    AND status = 'active'
    AND created_at >= now() - interval '6 months';

  IF _pair_recent > 0 THEN
    RAISE EXCEPTION 'TRUST_LIMIT_PAIR_COOLDOWN:You already have an active trust attestation of this type for this entity created in the last 6 months.';
  END IF;

  -- ── Constraint 3: Reciprocal within 48h without evidence → flag for XP halving ──
  IF NEW.from_node_type = 'profile' AND NEW.to_node_type = 'profile' THEN
    SELECT EXISTS (
      SELECT 1 FROM trust_edges
      WHERE from_node_type = 'profile'
        AND from_node_id = NEW.to_node_id
        AND to_node_type = 'profile'
        AND to_node_id = NEW.from_node_id
        AND status = 'active'
        AND created_at >= now() - interval '48 hours'
    ) INTO _reciprocal_recent;

    IF _reciprocal_recent AND (NEW.evidence_url IS NULL OR length(trim(NEW.evidence_url)) = 0) THEN
      NEW.tags := array_append(COALESCE(NEW.tags, '{}'), '__xp_halved');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_trust_edge_constraints
  BEFORE INSERT ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.validate_trust_edge_constraints();

-- ═══ 2. Update XP trigger to respect the __xp_halved flag ═══
CREATE OR REPLACE FUNCTION public.grant_trust_edge_xp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _target_user_id UUID;
  _base_xp INTEGER;
  _score_mult NUMERIC;
  _context_bonus INTEGER := 0;
  _raw_xp NUMERIC;
  _final_xp INTEGER;
  _current_month TEXT;
  _granted_this_month INTEGER;
  _month_key TEXT;
  _headroom INTEGER;
  _xp_to_grant INTEGER;
  _xp_to_pending INTEGER;
  _monthly_cap CONSTANT INTEGER := 40;
  _spec_stewardship INTEGER := 0;
  _spec_maker INTEGER := 0;
  _spec_resource INTEGER := 0;
  _spec_community INTEGER := 0;
  _spec_tech INTEGER := 0;
  _tag TEXT;
  _tag_lower TEXT;
  _is_halved BOOLEAN := false;
BEGIN
  IF NEW.visibility != 'public' OR NEW.status != 'active' THEN RETURN NEW; END IF;
  IF NEW.to_node_type != 'profile' THEN RETURN NEW; END IF;

  _target_user_id := NEW.to_node_id;

  -- Check halving flag
  IF NEW.tags IS NOT NULL AND '__xp_halved' = ANY(NEW.tags) THEN
    _is_halved := true;
  END IF;

  _base_xp := CASE NEW.edge_type
    WHEN 'skill_trust' THEN 2
    WHEN 'reliability' THEN 3
    WHEN 'collaboration' THEN 4
    WHEN 'stewardship' THEN 6
    WHEN 'financial_trust' THEN 8
    ELSE 2
  END;

  _score_mult := CASE NEW.score
    WHEN 1 THEN 0.5
    WHEN 2 THEN 0.75
    WHEN 3 THEN 1.0
    WHEN 4 THEN 1.15
    WHEN 5 THEN 1.3
    ELSE 1.0
  END;

  IF NEW.context_quest_id IS NOT NULL THEN _context_bonus := _context_bonus + 1; END IF;
  IF NEW.context_guild_id IS NOT NULL THEN _context_bonus := _context_bonus + 2; END IF;
  IF NEW.context_territory_id IS NOT NULL THEN _context_bonus := _context_bonus + 3; END IF;

  _raw_xp := (_base_xp * _score_mult) + _context_bonus;

  IF NEW.last_confirmed_at IS NOT NULL AND
     NEW.last_confirmed_at < now() - interval '24 months' THEN
    _raw_xp := _raw_xp * 0.8;
  END IF;

  -- Apply halving for reciprocal without evidence
  IF _is_halved THEN
    _raw_xp := _raw_xp * 0.5;
  END IF;

  _final_xp := GREATEST(1, FLOOR(_raw_xp));

  _current_month := to_char(now(), 'YYYY-MM');
  SELECT COALESCE(trust_xp_granted_this_month, 0), COALESCE(trust_xp_month_key, '')
  INTO _granted_this_month, _month_key
  FROM profiles WHERE user_id = _target_user_id FOR UPDATE;

  IF _month_key != _current_month THEN _granted_this_month := 0; END IF;

  _headroom := GREATEST(0, _monthly_cap - _granted_this_month);
  _xp_to_grant := LEAST(_final_xp, _headroom);
  _xp_to_pending := _final_xp - _xp_to_grant;

  IF NEW.tags IS NOT NULL THEN
    FOREACH _tag IN ARRAY NEW.tags LOOP
      _tag_lower := lower(_tag);
      IF _tag_lower = '__xp_halved' THEN CONTINUE; END IF;
      IF _tag_lower IN ('governance', 'stewardship', 'facilitation') THEN
        _spec_stewardship := _spec_stewardship + _xp_to_grant;
      ELSIF _tag_lower IN ('agroecology', 'construction', 'heritage', 'crafts') THEN
        _spec_maker := _spec_maker + _xp_to_grant;
      ELSIF _tag_lower IN ('fundraising', 'financial') THEN
        _spec_resource := _spec_resource + _xp_to_grant;
      ELSIF _tag_lower IN ('community', 'hospitality', 'mediation') THEN
        _spec_community := _spec_community + _xp_to_grant;
      ELSIF _tag_lower IN ('digital', 'data', 'ai', 'product') THEN
        _spec_tech := _spec_tech + _xp_to_grant;
      END IF;
    END LOOP;
  END IF;

  UPDATE profiles SET
    trust_xp_granted_this_month = CASE WHEN trust_xp_month_key = _current_month
      THEN trust_xp_granted_this_month + _xp_to_grant ELSE _xp_to_grant END,
    trust_xp_month_key = _current_month,
    xp_pending = xp_pending + _xp_to_pending,
    stewardship_xp = stewardship_xp + _spec_stewardship,
    maker_xp = maker_xp + _spec_maker,
    resource_catalyst_xp = resource_catalyst_xp + _spec_resource,
    community_xp = community_xp + _spec_community,
    tech_commons_xp = tech_commons_xp + _spec_tech
  WHERE user_id = _target_user_id;

  IF _xp_to_grant > 0 THEN
    PERFORM public.grant_user_xp(
      _target_user_id, 'TRUST_EDGE_RECEIVED', _xp_to_grant,
      NULL, NEW.context_territory_id, 'trust_edge', NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;
