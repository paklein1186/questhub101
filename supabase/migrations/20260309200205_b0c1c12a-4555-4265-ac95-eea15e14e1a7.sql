
CREATE OR REPLACE FUNCTION public.emit_ctg_for_contribution(p_user_id uuid, p_contribution_type text, p_related_entity_id text DEFAULT NULL::text, p_related_entity_type text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rule record;
  v_user_amount numeric;
  v_commons_amount numeric;
  v_new_balance numeric;
  v_multiplier numeric := 1.0;
  v_tx_type text;
BEGIN
  SELECT * INTO v_rule FROM ctg_emission_rules
  WHERE contribution_type = p_contribution_type AND is_active = true LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_active_rule'); END IF;

  BEGIN
    SELECT COALESCE(multiplier, 1.0) INTO v_multiplier FROM harvest_windows
    WHERE is_active = true AND starts_at <= now() AND ends_at >= now() LIMIT 1;
    IF NOT FOUND THEN v_multiplier := 1.0; END IF;
  EXCEPTION WHEN undefined_table THEN v_multiplier := 1.0;
  END;

  v_user_amount := FLOOR((v_rule.ctg_amount * v_multiplier) * (1 - v_rule.commons_share_percent / 100.0));
  v_commons_amount := v_rule.ctg_amount * v_multiplier - v_user_amount;

  INSERT INTO ctg_wallets(user_id, balance, lifetime_earned)
    VALUES(p_user_id, v_user_amount, v_user_amount)
  ON CONFLICT(user_id) DO UPDATE SET
    balance = ctg_wallets.balance + v_user_amount,
    lifetime_earned = ctg_wallets.lifetime_earned + v_user_amount,
    updated_at = now();

  SELECT balance INTO v_new_balance FROM ctg_wallets WHERE user_id = p_user_id;
  UPDATE profiles SET ctg_balance = v_new_balance WHERE user_id = p_user_id;

  v_tx_type := CASE p_contribution_type
    WHEN 'subtask_completed' THEN 'EARNED_SUBTASK'
    WHEN 'quest_completed' THEN 'EARNED_QUEST'
    WHEN 'quest_created' THEN 'EARNED_QUEST'
    WHEN 'ritual_participation' THEN 'EARNED_RITUAL'
    WHEN 'governance_vote' THEN 'EARNED_GOVERNANCE'
    WHEN 'review_given' THEN 'EARNED_REVIEW'
    WHEN 'documentation' THEN 'EARNED_DOCUMENTATION'
    WHEN 'mentorship' THEN 'EARNED_MENTORSHIP'
    WHEN 'proposal_accepted' THEN 'EARNED_GOVERNANCE'
    WHEN 'ecological_annotation' THEN 'EARNED_ECOLOGICAL'
    WHEN 'service_delivered' THEN 'EARNED_SERVICE'
    WHEN 'comment_given' THEN 'EARNED_COMMENT'
    WHEN 'trust_given' THEN 'EARNED_TRUST'
    WHEN 'post_published' THEN 'EARNED_POST'
    WHEN 'guild_created' THEN 'EARNED_GUILD'
    WHEN 'profile_completed' THEN 'EARNED_PROFILE'
    WHEN 'bounty_claimed' THEN 'EARNED_BOUNTY'
    WHEN 'course_completed' THEN 'EARNED_COURSE'
    WHEN 'course_published' THEN 'EARNED_COURSE'
    WHEN 'event_hosted' THEN 'EARNED_EVENT'
    WHEN 'natural_system_documented' THEN 'EARNED_NATURAL_SYSTEM'
    ELSE 'EARNED_CONTRIBUTION' END;

  INSERT INTO ctg_transactions(user_id, amount, balance_after, type, note, related_entity_id, related_entity_type)
  VALUES(p_user_id, v_user_amount, v_new_balance, v_tx_type, p_note, p_related_entity_id, p_related_entity_type);

  UPDATE ctg_commons_wallet SET
    balance = balance + v_commons_amount,
    lifetime_received = lifetime_received + v_commons_amount,
    updated_at = now()
  WHERE id = (SELECT id FROM ctg_commons_wallet LIMIT 1);

  RETURN jsonb_build_object('ok', true, 'user_amount', v_user_amount, 'commons_amount', v_commons_amount, 'new_balance', v_new_balance);
END;$function$;
