
-- ═══ 1. Add XP specialization & pending columns to profiles ═══
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stewardship_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maker_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resource_catalyst_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS community_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tech_commons_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_pending INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_xp_granted_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_xp_month_key TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM');

-- ═══ 2. Trust Edge XP Grant trigger function ═══
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
  -- Specialization
  _spec_stewardship INTEGER := 0;
  _spec_maker INTEGER := 0;
  _spec_resource INTEGER := 0;
  _spec_community INTEGER := 0;
  _spec_tech INTEGER := 0;
  _tag TEXT;
  _tag_lower TEXT;
BEGIN
  -- Only grant XP for public, active edges targeting a profile
  IF NEW.visibility != 'public' OR NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  IF NEW.to_node_type != 'profile' THEN
    RETURN NEW;
  END IF;

  _target_user_id := NEW.to_node_id;

  -- Base XP by edge_type
  _base_xp := CASE NEW.edge_type
    WHEN 'skill_trust' THEN 2
    WHEN 'reliability' THEN 3
    WHEN 'collaboration' THEN 4
    WHEN 'stewardship' THEN 6
    WHEN 'financial_trust' THEN 8
    ELSE 2
  END;

  -- Score multiplier
  _score_mult := CASE NEW.score
    WHEN 1 THEN 0.5
    WHEN 2 THEN 0.75
    WHEN 3 THEN 1.0
    WHEN 4 THEN 1.15
    WHEN 5 THEN 1.3
    ELSE 1.0
  END;

  -- Context bonuses
  IF NEW.context_quest_id IS NOT NULL THEN _context_bonus := _context_bonus + 1; END IF;
  IF NEW.context_guild_id IS NOT NULL THEN _context_bonus := _context_bonus + 2; END IF;
  IF NEW.context_territory_id IS NOT NULL THEN _context_bonus := _context_bonus + 3; END IF;

  -- Raw XP
  _raw_xp := (_base_xp * _score_mult) + _context_bonus;

  -- Freshness decay (edge older than 24 months from confirmed date)
  IF NEW.last_confirmed_at IS NOT NULL AND
     NEW.last_confirmed_at < now() - interval '24 months' THEN
    _raw_xp := _raw_xp * 0.8;
  END IF;

  _final_xp := GREATEST(1, FLOOR(_raw_xp));

  -- Monthly cap logic
  _current_month := to_char(now(), 'YYYY-MM');

  SELECT COALESCE(trust_xp_granted_this_month, 0), COALESCE(trust_xp_month_key, '')
  INTO _granted_this_month, _month_key
  FROM profiles WHERE user_id = _target_user_id FOR UPDATE;

  -- Reset counter if new month
  IF _month_key != _current_month THEN
    _granted_this_month := 0;
  END IF;

  _headroom := GREATEST(0, _monthly_cap - _granted_this_month);
  _xp_to_grant := LEAST(_final_xp, _headroom);
  _xp_to_pending := _final_xp - _xp_to_grant;

  -- Determine specialization from tags
  IF NEW.tags IS NOT NULL THEN
    FOREACH _tag IN ARRAY NEW.tags LOOP
      _tag_lower := lower(_tag);
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

  -- Update profile
  UPDATE profiles SET
    trust_xp_granted_this_month = CASE WHEN trust_xp_month_key = _current_month
      THEN trust_xp_granted_this_month + _xp_to_grant
      ELSE _xp_to_grant END,
    trust_xp_month_key = _current_month,
    xp_pending = xp_pending + _xp_to_pending,
    stewardship_xp = stewardship_xp + _spec_stewardship,
    maker_xp = maker_xp + _spec_maker,
    resource_catalyst_xp = resource_catalyst_xp + _spec_resource,
    community_xp = community_xp + _spec_community,
    tech_commons_xp = tech_commons_xp + _spec_tech
  WHERE user_id = _target_user_id;

  -- Grant general XP via existing function (only the allowed portion)
  IF _xp_to_grant > 0 THEN
    PERFORM public.grant_user_xp(
      _target_user_id,
      'TRUST_EDGE_RECEIVED',
      _xp_to_grant,
      NULL,
      NEW.context_territory_id,
      'trust_edge',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trust_edge_xp
  AFTER INSERT ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.grant_trust_edge_xp();

-- ═══ 3. Monthly pending XP release function ═══
-- Releases 20% of xp_pending for all users
CREATE OR REPLACE FUNCTION public.release_pending_trust_xp()
  RETURNS TABLE(users_processed integer, total_released integer)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _user RECORD;
  _release INTEGER;
  _count INTEGER := 0;
  _total INTEGER := 0;
BEGIN
  FOR _user IN
    SELECT user_id, xp_pending FROM profiles WHERE xp_pending > 0
  LOOP
    _release := GREATEST(1, FLOOR(_user.xp_pending * 0.2));

    UPDATE profiles SET
      xp_pending = xp_pending - _release
    WHERE user_id = _user.user_id;

    -- Grant via standard XP function
    PERFORM public.grant_user_xp(
      _user.user_id,
      'TRUST_XP_PENDING_RELEASE',
      _release,
      NULL, NULL,
      'system', 'pending_release'
    );

    _count := _count + 1;
    _total := _total + _release;
  END LOOP;

  RETURN QUERY SELECT _count, _total;
END;
$$;

-- Also protect the new sensitive fields from client-side tampering
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    NEW.credits_balance := OLD.credits_balance;
    NEW.xp := OLD.xp;
    NEW.xp_level := OLD.xp_level;
    NEW.xp_recent_12m := OLD.xp_recent_12m;
    NEW.contribution_index := OLD.contribution_index;
    NEW.total_shares_a := OLD.total_shares_a;
    NEW.total_shares_b := OLD.total_shares_b;
    NEW.governance_weight := OLD.governance_weight;
    NEW.is_cooperative_member := OLD.is_cooperative_member;
    NEW.lifetime_credits_earned := OLD.lifetime_credits_earned;
    NEW.lifetime_credits_spent := OLD.lifetime_credits_spent;
    NEW.lifetime_credits_faded := OLD.lifetime_credits_faded;
    NEW.demurrage_exempt := OLD.demurrage_exempt;
    NEW.last_demurrage_at := OLD.last_demurrage_at;
    -- Trust XP fields
    NEW.stewardship_xp := OLD.stewardship_xp;
    NEW.maker_xp := OLD.maker_xp;
    NEW.resource_catalyst_xp := OLD.resource_catalyst_xp;
    NEW.community_xp := OLD.community_xp;
    NEW.tech_commons_xp := OLD.tech_commons_xp;
    NEW.xp_pending := OLD.xp_pending;
    NEW.trust_xp_granted_this_month := OLD.trust_xp_granted_this_month;
    NEW.trust_xp_month_key := OLD.trust_xp_month_key;
  END IF;
  RETURN NEW;
END;
$$;
