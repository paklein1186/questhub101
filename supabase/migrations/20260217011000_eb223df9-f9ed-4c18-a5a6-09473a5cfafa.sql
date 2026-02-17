
-- Secure function for credit transfers between users and guilds
CREATE OR REPLACE FUNCTION public.transfer_credits(
  _target_type TEXT,       -- 'user' or 'guild'
  _target_id UUID,
  _amount INTEGER,
  _note TEXT DEFAULT NULL,
  _source_guild_id UUID DEFAULT NULL  -- if transferring FROM a guild
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
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount < 1 THEN
    RAISE EXCEPTION 'Transfer amount must be at least 1';
  END IF;

  -- ── CASE 1: Guild → User (guild admin sends guild credits to a user)
  IF _source_guild_id IS NOT NULL THEN
    -- Verify actor is guild admin
    SELECT role INTO _actor_role
    FROM guild_members
    WHERE guild_id = _source_guild_id AND user_id = _actor_id;

    IF _actor_role IS NULL OR _actor_role != 'ADMIN' THEN
      RAISE EXCEPTION 'Only guild admins can transfer guild credits';
    END IF;

    IF _target_type != 'user' THEN
      RAISE EXCEPTION 'Guilds can only transfer credits to users';
    END IF;

    -- Check guild balance
    SELECT COALESCE(credits_balance, 0) INTO _guild_balance
    FROM guilds
    WHERE id = _source_guild_id
    FOR UPDATE;

    IF _guild_balance < _amount THEN
      RAISE EXCEPTION 'Insufficient guild credits';
    END IF;

    -- Debit guild
    UPDATE guilds SET credits_balance = credits_balance - _amount WHERE id = _source_guild_id;

    INSERT INTO unit_credit_transactions (unit_type, unit_id, amount, type, note, created_by_user_id)
    VALUES ('GUILD', _source_guild_id, -_amount, 'TRANSFER_OUT', 
            COALESCE(_note, 'Transfer to user'), _actor_id);

    -- Credit user
    UPDATE profiles SET credits_balance = credits_balance + _amount WHERE user_id = _target_id;

    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_target_id, 'GIFT_RECEIVED', _amount, 
            COALESCE(_note, 'Received from guild'), 'guild', _source_guild_id::text);

    RETURN;
  END IF;

  -- ── CASE 2: User → User or User → Guild (sender is the authenticated user)
  SELECT COALESCE(credits_balance, 0) INTO _sender_balance
  FROM profiles
  WHERE user_id = _actor_id
  FOR UPDATE;

  IF _sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Debit sender
  UPDATE profiles SET credits_balance = credits_balance - _amount WHERE user_id = _actor_id;

  IF _target_type = 'user' THEN
    -- Cannot send to yourself
    IF _target_id = _actor_id THEN
      RAISE EXCEPTION 'Cannot transfer credits to yourself';
    END IF;

    -- Verify target user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = _target_id) THEN
      RAISE EXCEPTION 'Target user not found';
    END IF;

    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_actor_id, 'GIFT_SENT', -_amount, 
            COALESCE(_note, 'Transfer to user'), 'user', _target_id::text);

    -- Credit recipient
    UPDATE profiles SET credits_balance = credits_balance + _amount WHERE user_id = _target_id;

    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_target_id, 'GIFT_RECEIVED', _amount, 
            COALESCE(_note, 'Received from user'), 'user', _actor_id::text);

  ELSIF _target_type = 'guild' THEN
    -- Verify guild exists
    IF NOT EXISTS (SELECT 1 FROM guilds WHERE id = _target_id AND is_deleted = false) THEN
      RAISE EXCEPTION 'Target guild not found';
    END IF;

    INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_actor_id, 'GIFT_SENT', -_amount, 
            COALESCE(_note, 'Contribution to guild'), 'guild', _target_id::text);

    -- Credit guild
    UPDATE guilds SET credits_balance = credits_balance + _amount WHERE id = _target_id;

    INSERT INTO unit_credit_transactions (unit_type, unit_id, amount, type, note, created_by_user_id)
    VALUES ('GUILD', _target_id, _amount, 'TRANSFER_IN', 
            COALESCE(_note, 'Contribution from member'), _actor_id);
  ELSE
    RAISE EXCEPTION 'Invalid target type. Must be "user" or "guild"';
  END IF;
END;
$$;
