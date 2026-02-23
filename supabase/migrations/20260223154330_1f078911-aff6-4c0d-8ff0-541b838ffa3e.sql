
-- BLINDSPOT #1: Allow admins and edge functions (service_role) to grant credits to other users
-- Also allow quest reward distribution by checking if caller is quest creator
CREATE OR REPLACE FUNCTION public.grant_user_credits(
  _target_user_id uuid,
  _amount integer,
  _type text,
  _source text DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
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

  -- Validate type
  IF _type NOT IN ('INITIAL_GRANT', 'PURCHASE', 'REFERRAL_BONUS', 'QUEST_REWARD', 'ACHIEVEMENT_REWARD', 'MILESTONE_REWARD', 'ADMIN_GRANT', 'QUEST_REWARD_EARNED', 'SUBSCRIPTION_MONTHLY_CREDIT') THEN
    RAISE EXCEPTION 'Invalid credit transaction type';
  END IF;

  -- Determine permissions
  _is_admin := (_actor_id IS NOT NULL AND public.has_role(_actor_id, 'admin'));

  -- Service role (edge functions) can always grant — _actor_id will be NULL
  -- Admins can grant to anyone
  -- Regular users can only grant to themselves
  IF _actor_id IS NOT NULL AND NOT _is_admin AND _target_user_id != _actor_id THEN
    -- Check if this is a quest reward from the quest creator
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

  -- Get current balance with row lock
  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles
  WHERE user_id = _target_user_id
  FOR UPDATE;

  -- Insert transaction
  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_target_user_id, _type, _amount, _source, _related_entity_type, _related_entity_id);

  -- Update balance
  UPDATE profiles
  SET credits_balance = _current_balance + _amount
  WHERE user_id = _target_user_id;
END;
$$;

-- BLINDSPOT #2: Server-side cost validation for spend_user_credits
CREATE OR REPLACE FUNCTION public.spend_user_credits(
  _amount integer,
  _type text,
  _source text DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_balance integer;
  _expected_cost integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Server-side cost validation: verify amount matches expected cost for known types
  _expected_cost := CASE _type
    WHEN 'EXTRA_QUEST_CREATION' THEN 10
    WHEN 'EXTRA_POD_CREATION' THEN 5
    WHEN 'BOOST_QUEST_VISIBILITY' THEN 15
    WHEN 'BOOST_SERVICE_VISIBILITY' THEN 15
    WHEN 'FEATURE_QUEST_7D' THEN 40
    WHEN 'BOOST_GUILD_EXPLORE' THEN 12
    WHEN 'BOOST_COURSE' THEN 8
    WHEN 'ENABLE_AI_PRO_SESSION' THEN 5
    WHEN 'REDUCE_COMMISSION_BY_1_PERCENT' THEN 25
    ELSE NULL -- unknown types pass through (for future extensibility)
  END;

  IF _expected_cost IS NOT NULL AND _amount != _expected_cost THEN
    RAISE EXCEPTION 'Invalid amount for type %. Expected %', _type, _expected_cost;
  END IF;

  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_user_id, _type, -_amount, _source, _related_entity_type, _related_entity_id);

  UPDATE profiles
  SET credits_balance = _current_balance - _amount
  WHERE user_id = _user_id;
END;
$$;

-- BLINDSPOT #3: Add daily transfer cap and guild membership check to transfer_credits
CREATE OR REPLACE FUNCTION public.transfer_credits(
  _target_type text,
  _target_id uuid,
  _amount integer,
  _note text DEFAULT NULL,
  _source_guild_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor_id UUID := auth.uid();
  _sender_balance INTEGER;
  _guild_balance INTEGER;
  _actor_role TEXT;
  _daily_sent INTEGER;
  _daily_cap CONSTANT INTEGER := 500;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount < 1 THEN
    RAISE EXCEPTION 'Transfer amount must be at least 1';
  END IF;

  -- CASE 1: Guild → User
  IF _source_guild_id IS NOT NULL THEN
    SELECT role INTO _actor_role
    FROM guild_members
    WHERE guild_id = _source_guild_id AND user_id = _actor_id;

    IF _actor_role IS NULL OR _actor_role != 'ADMIN' THEN
      RAISE EXCEPTION 'Only guild admins can transfer guild credits';
    END IF;

    IF _target_type != 'user' THEN
      RAISE EXCEPTION 'Guilds can only transfer credits to users';
    END IF;

    -- Verify target is a member of the guild
    IF NOT EXISTS (SELECT 1 FROM guild_members WHERE guild_id = _source_guild_id AND user_id = _target_id) THEN
      RAISE EXCEPTION 'Target user must be a member of this guild';
    END IF;

    -- Daily cap for guild transfers
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO _daily_sent
    FROM unit_credit_transactions
    WHERE unit_type = 'GUILD' AND unit_id = _source_guild_id
      AND type = 'TRANSFER_OUT'
      AND created_at >= date_trunc('day', now());

    IF _daily_sent + _amount > _daily_cap THEN
      RAISE EXCEPTION 'Guild daily transfer limit reached (% credits/day)', _daily_cap;
    END IF;

    SELECT COALESCE(credits_balance, 0) INTO _guild_balance
    FROM guilds WHERE id = _source_guild_id FOR UPDATE;

    IF _guild_balance < _amount THEN
      RAISE EXCEPTION 'Insufficient guild credits';
    END IF;

    UPDATE guilds SET credits_balance = credits_balance - _amount WHERE id = _source_guild_id;
    INSERT INTO unit_credit_transactions (unit_type, unit_id, amount, type, note, created_by_user_id)
    VALUES ('GUILD', _source_guild_id, -_amount, 'TRANSFER_OUT', COALESCE(_note, 'Transfer to user'), _actor_id);

    UPDATE profiles SET credits_balance = credits_balance + _amount WHERE user_id = _target_id;
    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_target_id, 'GIFT_RECEIVED', _amount, COALESCE(_note, 'Received from guild'), 'guild', _source_guild_id::text);

    RETURN;
  END IF;

  -- CASE 2: User → User or User → Guild
  -- Daily cap for user transfers
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO _daily_sent
  FROM credit_transactions
  WHERE user_id = _actor_id AND type = 'GIFT_SENT'
    AND created_at >= date_trunc('day', now());

  IF _daily_sent + _amount > _daily_cap THEN
    RAISE EXCEPTION 'Daily transfer limit reached (% credits/day)', _daily_cap;
  END IF;

  SELECT COALESCE(credits_balance, 0) INTO _sender_balance
  FROM profiles WHERE user_id = _actor_id FOR UPDATE;

  IF _sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE profiles SET credits_balance = credits_balance - _amount WHERE user_id = _actor_id;

  IF _target_type = 'user' THEN
    IF _target_id = _actor_id THEN
      RAISE EXCEPTION 'Cannot transfer credits to yourself';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = _target_id) THEN
      RAISE EXCEPTION 'Target user not found';
    END IF;

    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_actor_id, 'GIFT_SENT', -_amount, COALESCE(_note, 'Transfer to user'), 'user', _target_id::text);

    UPDATE profiles SET credits_balance = credits_balance + _amount WHERE user_id = _target_id;

    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_target_id, 'GIFT_RECEIVED', _amount, COALESCE(_note, 'Received from user'), 'user', _actor_id::text);

  ELSIF _target_type = 'guild' THEN
    IF NOT EXISTS (SELECT 1 FROM guilds WHERE id = _target_id AND is_deleted = false) THEN
      RAISE EXCEPTION 'Target guild not found';
    END IF;

    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_actor_id, 'GIFT_SENT', -_amount, COALESCE(_note, 'Contribution to guild'), 'guild', _target_id::text);

    UPDATE guilds SET credits_balance = credits_balance + _amount WHERE id = _target_id;

    INSERT INTO unit_credit_transactions (unit_type, unit_id, amount, type, note, created_by_user_id)
    VALUES ('GUILD', _target_id, _amount, 'TRANSFER_IN', COALESCE(_note, 'Contribution from member'), _actor_id);
  ELSE
    RAISE EXCEPTION 'Invalid target type. Must be "user" or "guild"';
  END IF;
END;
$$;

-- BLINDSPOT #4: Validate quest has sufficient credit budget on publish
CREATE OR REPLACE FUNCTION public.validate_quest_credit_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _creator_balance integer;
BEGIN
  -- Only check when publishing (status going to published / is_published going true)
  IF NEW.is_published = true AND (OLD.is_published = false OR OLD.is_published IS NULL) THEN
    -- Only enforce for credit-funded quests with a budget > 0
    IF NEW.funding_type = 'CREDITS' AND COALESCE(NEW.credit_budget, 0) > 0 THEN
      SELECT COALESCE(credits_balance, 0) INTO _creator_balance
      FROM profiles WHERE user_id = NEW.created_by_user_id;

      IF _creator_balance < COALESCE(NEW.credit_budget, 0) THEN
        RAISE EXCEPTION 'Insufficient credits to fund this quest. You have % credits but need %.', _creator_balance, NEW.credit_budget;
      END IF;

      -- Escrow the credits
      UPDATE profiles
      SET credits_balance = credits_balance - NEW.credit_budget
      WHERE user_id = NEW.created_by_user_id;

      INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
      VALUES (NEW.created_by_user_id, 'QUEST_BUDGET_SPENT', -NEW.credit_budget, 'Quest budget escrowed', 'quest', NEW.id::text);

      NEW.escrow_credits := COALESCE(NEW.escrow_credits, 0) + NEW.credit_budget;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger (drop first to be safe)
DROP TRIGGER IF EXISTS trg_validate_quest_credit_budget ON quests;
CREATE TRIGGER trg_validate_quest_credit_budget
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION validate_quest_credit_budget();
