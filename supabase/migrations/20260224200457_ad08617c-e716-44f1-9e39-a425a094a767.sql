CREATE OR REPLACE FUNCTION public.grant_user_credits(
  _target_user_id uuid,
  _amount integer,
  _type text,
  _source text DEFAULT NULL::text,
  _related_entity_type text DEFAULT NULL::text,
  _related_entity_id text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Allowed: quest rewards by quest owners
    IF _type IN ('QUEST_REWARD', 'QUEST_REWARD_EARNED')
       AND _related_entity_type = 'quest'
       AND _related_entity_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM quests WHERE id = _related_entity_id::uuid AND created_by_user_id = _actor_id
      ) THEN
        RAISE EXCEPTION 'Only quest creators or admins can grant quest rewards';
      END IF;

    -- Allowed: trust-triggered system rewards only when called from triggers
    ELSIF _type IN ('TRUST_EDGE_MUTUAL', 'TRUST_EDGE_STEWARD_RECEIVED')
          AND pg_trigger_depth() > 0 THEN
      NULL;

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
$function$;