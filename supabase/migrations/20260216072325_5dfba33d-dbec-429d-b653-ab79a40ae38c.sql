-- Fix grant_user_xp to use the new 15-level Regenerative Collaboration Ladder thresholds
CREATE OR REPLACE FUNCTION public.grant_user_xp(
  _target_user_id uuid,
  _type text,
  _amount integer,
  _topic_id uuid DEFAULT NULL,
  _territory_id uuid DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor_id uuid := auth.uid();
  _current_xp integer;
  _current_xp_recent integer;
  _new_level integer;
  _today_total integer;
  _new_xp integer;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount <= 0 THEN
    RETURN;
  END IF;

  -- Daily cap check for COMMENT_UPVOTED
  IF _type = 'COMMENT_UPVOTED' THEN
    SELECT COALESCE(SUM(amount), 0) INTO _today_total
    FROM xp_events
    WHERE user_id = _target_user_id
      AND type = 'COMMENT_UPVOTED'
      AND created_at >= date_trunc('day', now());
    
    IF _today_total >= 50 THEN
      RETURN;
    END IF;
  END IF;

  -- Insert XP event
  INSERT INTO xp_events (user_id, type, amount, topic_id, territory_id, related_entity_type, related_entity_id)
  VALUES (_target_user_id, _type, _amount, _topic_id, _territory_id, _related_entity_type, _related_entity_id);

  -- Update profile totals
  SELECT COALESCE(xp, 0), COALESCE(xp_recent_12m, 0)
  INTO _current_xp, _current_xp_recent
  FROM profiles
  WHERE user_id = _target_user_id;

  _new_xp := _current_xp + _amount;

  -- 15-level Regenerative Collaboration Ladder thresholds
  _new_level := CASE
    WHEN _new_xp >= 12000 THEN 15
    WHEN _new_xp >= 9000 THEN 14
    WHEN _new_xp >= 6500 THEN 13
    WHEN _new_xp >= 4500 THEN 12
    WHEN _new_xp >= 3000 THEN 11
    WHEN _new_xp >= 2000 THEN 10
    WHEN _new_xp >= 1300 THEN 9
    WHEN _new_xp >= 900 THEN 8
    WHEN _new_xp >= 600 THEN 7
    WHEN _new_xp >= 400 THEN 6
    WHEN _new_xp >= 250 THEN 5
    WHEN _new_xp >= 150 THEN 4
    WHEN _new_xp >= 75 THEN 3
    WHEN _new_xp >= 25 THEN 2
    ELSE 1
  END;

  UPDATE profiles
  SET xp = _new_xp,
      xp_recent_12m = _current_xp_recent + _amount,
      xp_level = _new_level,
      contribution_index = _new_xp / 10
  WHERE user_id = _target_user_id;

  -- Legacy xp_transactions
  INSERT INTO xp_transactions (user_id, type, amount_xp, description, related_entity_type, related_entity_id)
  VALUES (_target_user_id, 'REWARD', _amount, _type, _related_entity_type, _related_entity_id);
END;
$function$;