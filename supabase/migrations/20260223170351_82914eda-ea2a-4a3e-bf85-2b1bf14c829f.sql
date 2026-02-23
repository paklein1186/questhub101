
-- ═══ 1. Table for "useful" attestation marks ═══
CREATE TABLE public.trust_edge_useful_marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trust_edge_id UUID NOT NULL REFERENCES public.trust_edges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trust_edge_id, user_id)
);

ALTER TABLE public.trust_edge_useful_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view useful marks"
  ON public.trust_edge_useful_marks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can mark as useful"
  ON public.trust_edge_useful_marks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User can remove own useful mark"
  ON public.trust_edge_useful_marks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Track whether creator credit was already granted (idempotency)
ALTER TABLE public.trust_edges
  ADD COLUMN IF NOT EXISTS creator_credit_granted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS useful_credit_granted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS renewal_credit_granted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mutual_credit_granted BOOLEAN NOT NULL DEFAULT false;

-- Add valid type for trust credits to grant_user_credits
-- We update the function to accept TRUST_* types
CREATE OR REPLACE FUNCTION public.grant_user_credits(_target_user_id uuid, _amount integer, _type text, _source text DEFAULT NULL::text, _related_entity_type text DEFAULT NULL::text, _related_entity_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    'TRUST_EDGE_MUTUAL', 'TRUST_EDGE_FACILITATOR', 'TRUST_EDGE_STEWARD_RECEIVED'
  ) THEN
    RAISE EXCEPTION 'Invalid credit transaction type';
  END IF;

  _is_admin := (_actor_id IS NOT NULL AND public.has_role(_actor_id, 'admin'));

  IF _actor_id IS NOT NULL AND NOT _is_admin AND _target_user_id != _actor_id THEN
    IF _type IN ('QUEST_REWARD', 'QUEST_REWARD_EARNED') AND _related_entity_type = 'quest' AND _related_entity_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM quests WHERE id = _related_entity_id::uuid AND created_by_user_id = _actor_id
      ) THEN
        RAISE EXCEPTION 'Only quest creators or admins can grant quest rewards';
      END IF;
    ELSE
      RAISE EXCEPTION 'Cannot grant credits to other users';
    END IF;
  END IF;

  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles WHERE user_id = _target_user_id FOR UPDATE;

  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_target_user_id, _type, _amount, _source, _related_entity_type, _related_entity_id);

  UPDATE profiles SET credits_balance = _current_balance + _amount WHERE user_id = _target_user_id;
END;
$$;

-- ═══ 2. Creator credit reward on INSERT ═══
CREATE OR REPLACE FUNCTION public.reward_trust_edge_creator()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _credits NUMERIC := 0;
  _final INTEGER;
BEGIN
  -- Only for new active edges from a profile node (created by a user)
  IF NEW.from_node_type != 'profile' THEN RETURN NEW; END IF;
  IF NEW.status != 'active' THEN RETURN NEW; END IF;
  IF NEW.creator_credit_granted THEN RETURN NEW; END IF;

  -- Visibility bonus
  IF NEW.visibility = 'public' THEN
    _credits := _credits + 1;
  ELSIF NEW.visibility = 'network' THEN
    _credits := _credits + 0.5;
  END IF;

  -- Evidence bonus
  IF NEW.evidence_url IS NOT NULL AND length(trim(NEW.evidence_url)) > 0 THEN
    _credits := _credits + 1;
  END IF;

  _final := GREATEST(0, FLOOR(_credits));

  IF _final > 0 THEN
    PERFORM public.grant_user_credits(
      NEW.created_by, _final, 'TRUST_EDGE_CREATOR',
      'Trust attestation created', 'trust_edge', NEW.id::text
    );
  END IF;

  NEW.creator_credit_granted := true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reward_trust_edge_creator
  BEFORE INSERT ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.reward_trust_edge_creator();

-- ═══ 3. Useful attestation threshold → +2 credits to creator ═══
CREATE OR REPLACE FUNCTION public.check_trust_edge_useful_threshold()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _mark_count INTEGER;
  _edge RECORD;
BEGIN
  SELECT count(*) INTO _mark_count
  FROM trust_edge_useful_marks WHERE trust_edge_id = NEW.trust_edge_id;

  IF _mark_count >= 3 THEN
    SELECT * INTO _edge FROM trust_edges WHERE id = NEW.trust_edge_id;

    IF _edge IS NOT NULL AND NOT _edge.useful_credit_granted THEN
      UPDATE trust_edges SET useful_credit_granted = true WHERE id = NEW.trust_edge_id;

      PERFORM public.grant_user_credits(
        _edge.created_by, 2, 'TRUST_EDGE_USEFUL',
        'Trust attestation marked useful by 3+ users', 'trust_edge', _edge.id::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trust_edge_useful_threshold
  AFTER INSERT ON public.trust_edge_useful_marks
  FOR EACH ROW EXECUTE FUNCTION public.check_trust_edge_useful_threshold();

-- ═══ 4. Renewal credit: UPDATE after 12-24 months → +2 credits ═══
CREATE OR REPLACE FUNCTION public.reward_trust_edge_renewal()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _age_months NUMERIC;
BEGIN
  -- Only when last_confirmed_at is being refreshed
  IF NEW.last_confirmed_at IS NULL OR OLD.last_confirmed_at IS NULL THEN RETURN NEW; END IF;
  IF NEW.last_confirmed_at = OLD.last_confirmed_at THEN RETURN NEW; END IF;
  IF NEW.renewal_credit_granted THEN RETURN NEW; END IF;
  IF NEW.status != 'active' THEN RETURN NEW; END IF;

  _age_months := EXTRACT(EPOCH FROM (now() - OLD.last_confirmed_at)) / (30.0 * 24 * 3600);

  IF _age_months >= 12 AND _age_months <= 24 THEN
    PERFORM public.grant_user_credits(
      NEW.created_by, 2, 'TRUST_EDGE_RENEWAL',
      'Trust renewed after 12-24 months', 'trust_edge', NEW.id::text
    );
    NEW.renewal_credit_granted := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reward_trust_edge_renewal
  BEFORE UPDATE ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.reward_trust_edge_renewal();

-- ═══ 5. Mutual trust within 7 days → +1.5 (rounded to 1) each ═══
CREATE OR REPLACE FUNCTION public.reward_mutual_trust()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _reciprocal RECORD;
BEGIN
  IF NEW.status != 'active' THEN RETURN NEW; END IF;
  IF NEW.mutual_credit_granted THEN RETURN NEW; END IF;

  -- Look for a reciprocal active edge created within 7 days
  SELECT * INTO _reciprocal
  FROM trust_edges
  WHERE from_node_type = NEW.to_node_type
    AND from_node_id = NEW.to_node_id
    AND to_node_type = NEW.from_node_type
    AND to_node_id = NEW.from_node_id
    AND status = 'active'
    AND id != NEW.id
    AND created_at >= (NEW.created_at - interval '7 days')
    AND NOT mutual_credit_granted
  LIMIT 1;

  IF _reciprocal IS NOT NULL THEN
    -- Grant 1 credit each (floor of 1.5)
    PERFORM public.grant_user_credits(
      NEW.created_by, 1, 'TRUST_EDGE_MUTUAL',
      'Mutual trust attestation within 7 days', 'trust_edge', NEW.id::text
    );

    IF _reciprocal.from_node_type = 'profile' THEN
      PERFORM public.grant_user_credits(
        _reciprocal.created_by, 1, 'TRUST_EDGE_MUTUAL',
        'Mutual trust attestation within 7 days', 'trust_edge', _reciprocal.id::text
      );
    END IF;

    UPDATE trust_edges SET mutual_credit_granted = true WHERE id IN (NEW.id, _reciprocal.id);
    NEW.mutual_credit_granted := true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reward_mutual_trust
  BEFORE INSERT ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.reward_mutual_trust();

-- ═══ 6. Facilitator closure bonus: +3 credits ═══
-- Triggered when a trust edge is created with a quest or guild context
-- AND the creator holds a "facilitator" role in that entity
CREATE OR REPLACE FUNCTION public.reward_facilitator_trust()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _is_facilitator BOOLEAN := false;
BEGIN
  IF NEW.from_node_type != 'profile' THEN RETURN NEW; END IF;
  IF NEW.status != 'active' THEN RETURN NEW; END IF;

  -- Check guild facilitator role
  IF NEW.context_guild_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM entity_role_assignments era
      JOIN entity_roles er ON er.id = era.entity_role_id
      WHERE era.user_id = NEW.created_by
        AND er.entity_id = NEW.context_guild_id::text
        AND er.entity_type = 'GUILD'
        AND lower(er.name) IN ('facilitator', 'facilitateur', 'facilitatrice')
    ) INTO _is_facilitator;
  END IF;

  -- Check quest facilitator
  IF NOT _is_facilitator AND NEW.context_quest_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM quest_participants qp
      WHERE qp.quest_id = NEW.context_quest_id
        AND qp.user_id = NEW.created_by
        AND qp.role = 'OWNER'
    ) INTO _is_facilitator;
  END IF;

  IF _is_facilitator THEN
    PERFORM public.grant_user_credits(
      NEW.created_by, 3, 'TRUST_EDGE_FACILITATOR',
      'Facilitator closure trust attestation', 'trust_edge', NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reward_facilitator_trust
  AFTER INSERT ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.reward_facilitator_trust();

-- ═══ 7. Receiver steward credit ═══
-- If edge_type = stewardship or financial_trust AND receiver is active steward → +1
CREATE OR REPLACE FUNCTION public.reward_steward_receiver()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _is_steward BOOLEAN := false;
BEGIN
  IF NEW.to_node_type != 'profile' THEN RETURN NEW; END IF;
  IF NEW.status != 'active' THEN RETURN NEW; END IF;
  IF NEW.edge_type NOT IN ('stewardship', 'financial_trust') THEN RETURN NEW; END IF;

  -- Check if receiver is guild admin (steward)
  SELECT EXISTS (
    SELECT 1 FROM guild_members
    WHERE user_id = NEW.to_node_id AND role = 'ADMIN'
  ) INTO _is_steward;

  -- Or topic steward
  IF NOT _is_steward THEN
    SELECT EXISTS (
      SELECT 1 FROM topic_stewards WHERE user_id = NEW.to_node_id
    ) INTO _is_steward;
  END IF;

  IF _is_steward THEN
    PERFORM public.grant_user_credits(
      NEW.to_node_id, 1, 'TRUST_EDGE_STEWARD_RECEIVED',
      'Stewardship trust received as active steward', 'trust_edge', NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reward_steward_receiver
  AFTER INSERT ON public.trust_edges
  FOR EACH ROW EXECUTE FUNCTION public.reward_steward_receiver();
