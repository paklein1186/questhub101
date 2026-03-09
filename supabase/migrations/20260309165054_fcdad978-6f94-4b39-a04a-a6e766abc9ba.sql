
CREATE OR REPLACE FUNCTION public.emit_ctg_for_contribution(
  p_user_id uuid,
  p_contribution_type text,
  p_related_entity_id text DEFAULT NULL,
  p_related_entity_type text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule record;
  v_user_amount numeric;
  v_commons_amount numeric;
  v_new_balance numeric;
  v_multiplier numeric := 1.0;
BEGIN
  -- Get active emission rule
  SELECT * INTO v_rule FROM ctg_emission_rules
  WHERE contribution_type = p_contribution_type AND is_active = true LIMIT 1;

  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_active_rule'); END IF;

  -- Check harvest window multiplier (table may not exist yet)
  BEGIN
    SELECT COALESCE(multiplier, 1.0) INTO v_multiplier FROM harvest_windows
    WHERE is_active = true AND starts_at <= now() AND ends_at >= now() LIMIT 1;
  EXCEPTION WHEN undefined_table THEN v_multiplier := 1.0;
  END;

  v_user_amount := FLOOR((v_rule.ctg_amount * v_multiplier) * (1 - v_rule.commons_share_percent / 100.0));
  v_commons_amount := v_rule.ctg_amount * v_multiplier - v_user_amount;

  -- Upsert user wallet
  INSERT INTO ctg_wallets(user_id, balance, lifetime_earned)
    VALUES(p_user_id, v_user_amount, v_user_amount)
  ON CONFLICT(user_id) DO UPDATE SET
    balance = ctg_wallets.balance + v_user_amount,
    lifetime_earned = ctg_wallets.lifetime_earned + v_user_amount,
    updated_at = now();

  SELECT balance INTO v_new_balance FROM ctg_wallets WHERE user_id = p_user_id;

  -- Sync profiles.ctg_balance
  UPDATE profiles SET ctg_balance = v_new_balance WHERE user_id = p_user_id;

  -- Insert transaction
  INSERT INTO ctg_transactions(user_id, amount, balance_after, type, note, related_entity_id, related_entity_type)
  VALUES(p_user_id, v_user_amount, v_new_balance,
    CASE p_contribution_type
      WHEN 'subtask_completed' THEN 'EARNED_SUBTASK'
      WHEN 'quest_completed' THEN 'EARNED_QUEST'
      WHEN 'ritual_participation' THEN 'EARNED_RITUAL'
      WHEN 'governance_vote' THEN 'EARNED_GOVERNANCE'
      WHEN 'review_given' THEN 'EARNED_REVIEW'
      WHEN 'documentation' THEN 'EARNED_DOCUMENTATION'
      WHEN 'mentorship' THEN 'EARNED_MENTORSHIP'
      WHEN 'proposal_accepted' THEN 'EARNED_GOVERNANCE'
      WHEN 'ecological_annotation' THEN 'EARNED_ECOLOGICAL'
      WHEN 'service_delivered' THEN 'EARNED_SERVICE'
      ELSE 'EARNED_CONTRIBUTION' END,
    p_note, p_related_entity_id, p_related_entity_type);

  -- Commons wallet
  UPDATE ctg_commons_wallet SET
    balance = balance + v_commons_amount,
    lifetime_received = lifetime_received + v_commons_amount,
    updated_at = now()
  WHERE id = (SELECT id FROM ctg_commons_wallet LIMIT 1);

  RETURN jsonb_build_object('ok', true, 'user_amount', v_user_amount, 'commons_amount', v_commons_amount, 'new_balance', v_new_balance);
END;$$;

-- Add service_delivered emission rule
INSERT INTO ctg_emission_rules (contribution_type, ctg_amount, commons_share_percent, is_active)
VALUES ('service_delivered', 20, 10, true)
ON CONFLICT DO NOTHING;
