
-- ═══════════════════════════════════════════════════════════
-- Eco Quest Reward Engine (DB functions + trigger)
-- ═══════════════════════════════════════════════════════════

-- Helper: load eco_quest_rewards config
CREATE OR REPLACE FUNCTION public.get_eco_config()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT value FROM cooperative_settings WHERE key = 'eco_quest_rewards' LIMIT 1;
$$;

-- ═══════════════════════════════════════════════════════════
-- Main: calculate and distribute eco quest rewards
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.distribute_eco_quest_rewards(_quest_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _quest RECORD;
  _system RECORD;
  _config JSONB;
  _base JSONB;
  _participant RECORD;
  _participant_count INT;
  _sensitivity_mult NUMERIC;
  _season_mult NUMERIC;
  _collective_mult NUMERIC;
  _final_xp INT;
  _final_credits INT;
  _final_biopoints INT;
  _base_xp INT;
  _base_credits INT;
  _base_biopoints INT;
  _collective_threshold INT;
  _current_month INT;
  _season_phase TEXT;
BEGIN
  -- Load config
  _config := get_eco_config();
  IF _config IS NULL THEN RETURN; END IF;

  -- Load quest
  SELECT q.id, q.eco_category, q.natural_system_id, q.title
  INTO _quest
  FROM quests q WHERE q.id = _quest_id;

  IF _quest IS NULL OR _quest.natural_system_id IS NULL THEN RETURN; END IF;
  IF _quest.eco_category IS NULL OR _quest.eco_category::text = 'none' THEN RETURN; END IF;

  -- Load base rewards for this category
  _base := _config->'base_rewards'->(_quest.eco_category::text);
  IF _base IS NULL THEN RETURN; END IF;

  _base_xp := COALESCE((_base->>'xp')::int, 3);
  _base_credits := COALESCE((_base->>'credits')::int, 2);
  _base_biopoints := COALESCE((_base->>'biopoints')::int, 1);

  -- Load natural system
  SELECT ns.id, ns.regenerative_potential, ns.seasonal_cycle, ns.health_index
  INTO _system
  FROM natural_systems ns WHERE ns.id = _quest.natural_system_id AND ns.is_deleted = false;

  IF _system IS NULL THEN RETURN; END IF;

  -- ── Sensitivity multiplier (from regenerative_potential: 0-100 → 0.8-1.3) ──
  _sensitivity_mult := 0.8 + (COALESCE(_system.regenerative_potential, 50) / 100.0) * 0.5;
  _sensitivity_mult := GREATEST(0.8, LEAST(1.3, _sensitivity_mult));

  -- ── Season multiplier ──
  _current_month := EXTRACT(MONTH FROM now())::int;
  IF _system.seasonal_cycle IS NOT NULL AND _system.seasonal_cycle ? 'peak_months' THEN
    -- Check if current month is in peak season
    IF _system.seasonal_cycle->'peak_months' @> to_jsonb(_current_month) THEN
      _season_mult := 1.2;  -- Peak season bonus
    ELSE
      _season_mult := 0.9;  -- Off-peak
    END IF;
  ELSE
    _season_mult := 1.0;  -- No seasonal data
  END IF;
  _season_mult := GREATEST(0.8, LEAST(1.3, _season_mult));

  -- ── Collective multiplier ──
  _collective_threshold := COALESCE((_config->>'collective_threshold')::int, 5);
  SELECT COUNT(*)::int INTO _participant_count
  FROM quest_participants WHERE quest_id = _quest_id;

  IF _participant_count > _collective_threshold THEN
    _collective_mult := LEAST(1.3, 1.0 + (_participant_count - _collective_threshold) * 0.05);
  ELSE
    _collective_mult := 1.0;
  END IF;

  -- ── Calculate final rewards ──
  _final_xp := GREATEST(1, ROUND(_base_xp * _sensitivity_mult * _season_mult * _collective_mult));
  _final_credits := GREATEST(1, ROUND(_base_credits * _sensitivity_mult * _season_mult));
  _final_biopoints := GREATEST(1, ROUND(_base_biopoints * _sensitivity_mult * _season_mult * _collective_mult));

  -- ── Distribute to each participant ──
  FOR _participant IN
    SELECT user_id FROM quest_participants WHERE quest_id = _quest_id
  LOOP
    -- XP
    PERFORM grant_user_xp(
      _participant.user_id, 'ECO_QUEST_COMPLETED', _final_xp,
      NULL, NULL, 'quest', _quest_id::text
    );

    -- Credits (using grant_user_credits)
    PERFORM grant_user_credits(
      _participant.user_id, _final_credits, 'QUEST_REWARD_EARNED',
      'Ecological quest: ' || _quest.eco_category::text,
      'quest', _quest_id::text
    );

    -- Biopoints
    INSERT INTO biopoints_transactions (user_id, amount, type, source, natural_system_id, quest_id)
    VALUES (
      _participant.user_id, _final_biopoints, 'ECO_QUEST_REWARD',
      'Eco quest (' || _quest.eco_category::text || '): ' || _quest.title,
      _quest.natural_system_id, _quest_id
    );

    UPDATE profiles SET biopoints_balance = biopoints_balance + _final_biopoints
    WHERE user_id = _participant.user_id;
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- Trigger: auto-distribute on quest completion
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trg_eco_quest_completed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes to COMPLETED
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    -- Only for eco quests with a natural system link
    IF NEW.natural_system_id IS NOT NULL AND NEW.eco_category IS NOT NULL AND NEW.eco_category::text != 'none' THEN
      PERFORM distribute_eco_quest_rewards(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eco_quest_reward ON public.quests;
CREATE TRIGGER trg_eco_quest_reward
  AFTER UPDATE ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION trg_eco_quest_completed();

-- ═══════════════════════════════════════════════════════════
-- Biopoints health improvement distribution
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.distribute_health_improvement_biopoints()
RETURNS TABLE(system_name TEXT, improvement INT, recipients INT, total_distributed INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _budget RECORD;
  _config JSONB;
  _eval_months INT;
  _threshold INT;
  _old_health INT;
  _current_health INT;
  _improvement INT;
  _contributor RECORD;
  _total_weight NUMERIC;
  _share INT;
  _distributed INT;
  _sys_name TEXT;
BEGIN
  _config := get_eco_config();
  _eval_months := COALESCE((_config->>'health_evaluation_months')::int, 6);
  _threshold := COALESCE((_config->>'health_improvement_threshold')::int, 5);

  FOR _budget IN
    SELECT bb.*, ns.name AS system_name, ns.health_index AS current_health
    FROM biopoints_budgets bb
    JOIN natural_systems ns ON ns.id = bb.natural_system_id
    WHERE bb.is_active = true AND bb.remaining_budget > 0
  LOOP
    -- Get health from N months ago
    SELECT health_index INTO _old_health
    FROM natural_system_health_snapshots
    WHERE natural_system_id = _budget.natural_system_id
      AND recorded_at <= now() - (_eval_months || ' months')::interval
    ORDER BY recorded_at DESC LIMIT 1;

    IF _old_health IS NULL THEN CONTINUE; END IF;

    _current_health := _budget.current_health;
    _improvement := _current_health - _old_health;

    IF _improvement < _threshold THEN CONTINUE; END IF;

    -- Get contributors and their total biopoints earned for this system in the period
    _total_weight := 0;
    _distributed := 0;

    FOR _contributor IN
      SELECT bt.user_id, SUM(bt.amount) AS earned
      FROM biopoints_transactions bt
      WHERE bt.natural_system_id = _budget.natural_system_id
        AND bt.type = 'ECO_QUEST_REWARD'
        AND bt.created_at >= now() - (_eval_months || ' months')::interval
      GROUP BY bt.user_id
    LOOP
      _total_weight := _total_weight + _contributor.earned;
    END LOOP;

    IF _total_weight = 0 THEN CONTINUE; END IF;

    FOR _contributor IN
      SELECT bt.user_id, SUM(bt.amount) AS earned
      FROM biopoints_transactions bt
      WHERE bt.natural_system_id = _budget.natural_system_id
        AND bt.type = 'ECO_QUEST_REWARD'
        AND bt.created_at >= now() - (_eval_months || ' months')::interval
      GROUP BY bt.user_id
    LOOP
      _share := GREATEST(1, ROUND((_budget.remaining_budget * _contributor.earned / _total_weight)::numeric));
      _share := LEAST(_share, _budget.remaining_budget - _distributed);

      IF _share <= 0 THEN CONTINUE; END IF;

      INSERT INTO biopoints_transactions (user_id, amount, type, source, natural_system_id)
      VALUES (
        _contributor.user_id, _share, 'HEALTH_IMPROVEMENT_BONUS',
        'Health improvement +' || _improvement || ' for ' || _budget.system_name,
        _budget.natural_system_id
      );

      UPDATE profiles SET biopoints_balance = biopoints_balance + _share
      WHERE user_id = _contributor.user_id;

      _distributed := _distributed + _share;
    END LOOP;

    -- Update budget
    UPDATE biopoints_budgets
    SET remaining_budget = GREATEST(0, remaining_budget - _distributed), updated_at = now()
    WHERE id = _budget.id;

    system_name := _budget.system_name;
    improvement := _improvement;
    recipients := (SELECT COUNT(DISTINCT user_id) FROM biopoints_transactions
      WHERE natural_system_id = _budget.natural_system_id AND type = 'HEALTH_IMPROVEMENT_BONUS'
      AND created_at >= now() - interval '1 minute');
    total_distributed := _distributed;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Add ECO types to grant_user_credits whitelist
-- (The existing function checks against a list - we need ECO_QUEST_REWARD to be allowed)
-- We'll add it by updating the grant function's type check
CREATE OR REPLACE FUNCTION public.grant_user_credits(_target_user_id uuid, _amount integer, _type text, _source text DEFAULT NULL::text, _related_entity_type text DEFAULT NULL::text, _related_entity_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _current_balance integer;
  _is_admin boolean;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF _type NOT IN (
    'INITIAL_GRANT', 'PURCHASE', 'REFERRAL_BONUS', 'QUEST_REWARD',
    'ACHIEVEMENT_REWARD', 'MILESTONE_REWARD', 'ADMIN_GRANT',
    'QUEST_REWARD_EARNED', 'SUBSCRIPTION_MONTHLY_CREDIT',
    'TRUST_EDGE_CREATOR', 'TRUST_EDGE_USEFUL', 'TRUST_EDGE_RENEWAL',
    'TRUST_EDGE_MUTUAL', 'TRUST_EDGE_FACILITATOR', 'TRUST_EDGE_STEWARD_RECEIVED',
    'ECO_QUEST_REWARD'
  ) THEN
    RAISE EXCEPTION 'Invalid credit transaction type';
  END IF;

  _is_admin := (_actor_id IS NOT NULL AND public.has_role(_actor_id, 'admin'));

  IF _actor_id IS NOT NULL AND NOT _is_admin AND _target_user_id != _actor_id THEN
    IF _type IN ('QUEST_REWARD', 'QUEST_REWARD_EARNED', 'ECO_QUEST_REWARD')
       AND _related_entity_type = 'quest'
       AND _related_entity_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM quests WHERE id = _related_entity_id::uuid AND created_by_user_id = _actor_id
      ) THEN
        -- Allow trigger-context calls
        IF pg_trigger_depth() = 0 THEN
          RAISE EXCEPTION 'Only quest creators or admins can grant quest rewards';
        END IF;
      END IF;
    ELSIF _type IN ('TRUST_EDGE_MUTUAL', 'TRUST_EDGE_STEWARD_RECEIVED')
          AND pg_trigger_depth() > 0 THEN
      NULL;
    ELSE
      IF pg_trigger_depth() = 0 THEN
        RAISE EXCEPTION 'Cannot grant credits to other users';
      END IF;
    END IF;
  END IF;

  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles WHERE user_id = _target_user_id FOR UPDATE;

  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_target_user_id, _type, _amount, _source, _related_entity_type, _related_entity_id);

  UPDATE profiles SET credits_balance = _current_balance + _amount WHERE user_id = _target_user_id;
END;
$$;
