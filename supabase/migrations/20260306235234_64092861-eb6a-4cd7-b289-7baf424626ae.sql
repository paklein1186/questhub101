
-- Function: emit_ctg_on_contribution()
CREATE OR REPLACE FUNCTION public.emit_ctg_on_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  ctg_to_emit NUMERIC;
  commons_amount NUMERIC;
  user_amount NUMERIC;
  new_balance NUMERIC;
  tx_type TEXT;
BEGIN
  -- Only emit for verified or logged contributions
  IF NEW.status NOT IN ('verified', 'logged') THEN
    RETURN NEW;
  END IF;

  -- 1. Find emission rule
  SELECT * INTO rule
  FROM ctg_emission_rules
  WHERE contribution_type = NEW.contribution_type AND is_active = true
  LIMIT 1;

  -- 2. No rule found, skip
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 3-5. Calculate amounts
  ctg_to_emit := rule.ctg_amount;
  commons_amount := ctg_to_emit * (rule.commons_share_percent / 100.0);
  user_amount := ctg_to_emit - commons_amount;

  -- 6. Upsert wallet
  INSERT INTO ctg_wallets (user_id, balance, lifetime_earned, updated_at)
  VALUES (NEW.user_id, user_amount, user_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    balance = ctg_wallets.balance + user_amount,
    lifetime_earned = ctg_wallets.lifetime_earned + user_amount,
    updated_at = now();

  -- Get new balance
  SELECT balance INTO new_balance FROM ctg_wallets WHERE user_id = NEW.user_id;

  -- 7. Map contribution_type to transaction type
  tx_type := CASE NEW.contribution_type
    WHEN 'quest_completed' THEN 'EARNED_QUEST'
    WHEN 'subtask_completed' THEN 'EARNED_SUBTASK'
    WHEN 'proposal_accepted' THEN 'EARNED_QUEST'
    WHEN 'review_given' THEN 'EARNED_SERVICE'
    WHEN 'ritual_participation' THEN 'EARNED_RITUAL'
    WHEN 'documentation' THEN 'EARNED_SERVICE'
    WHEN 'mentorship' THEN 'EARNED_MENTORSHIP'
    WHEN 'governance_vote' THEN 'EARNED_GOVERNANCE'
    WHEN 'ecological_annotation' THEN 'EARNED_SERVICE'
    WHEN 'insight' THEN 'EARNED_SERVICE'
    WHEN 'debugging' THEN 'EARNED_SERVICE'
    ELSE 'EARNED_SERVICE'
  END;

  INSERT INTO ctg_transactions (user_id, amount, type, related_entity_type, related_entity_id, note, balance_after)
  VALUES (NEW.user_id, user_amount, tx_type, 'contribution_log', NEW.id::TEXT,
          'Auto-émission : ' || NEW.title, new_balance);

  -- 8. Update commons wallet
  UPDATE ctg_commons_wallet SET
    balance = balance + commons_amount,
    lifetime_received = lifetime_received + commons_amount,
    updated_at = now();

  -- 9. Commons emission transaction
  INSERT INTO ctg_transactions (user_id, amount, type, related_entity_type, related_entity_id, note, balance_after)
  VALUES (NEW.user_id, commons_amount, 'COMMONS_EMISSION', 'contribution_log', NEW.id::TEXT,
          'Commons share (' || rule.commons_share_percent || '%) de : ' || NEW.title, new_balance);

  -- 10. Denormalize to profiles
  UPDATE profiles SET ctg_balance = new_balance WHERE user_id = NEW.user_id;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'emit_ctg_on_contribution failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger
CREATE TRIGGER trg_emit_ctg_on_contribution
  AFTER INSERT ON public.contribution_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_ctg_on_contribution();
