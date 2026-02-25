CREATE OR REPLACE FUNCTION public.validate_quest_credit_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _creator_balance integer;
BEGIN
  -- Only check when a quest is published (draft -> non-draft transition)
  IF COALESCE(OLD.is_draft, true) = true AND COALESCE(NEW.is_draft, false) = false THEN
    -- Only enforce for credit-funded quests with a budget > 0
    IF NEW.funding_type = 'CREDITS' AND COALESCE(NEW.credit_budget, 0) > 0 THEN
      SELECT COALESCE(credits_balance, 0)
      INTO _creator_balance
      FROM profiles
      WHERE user_id = NEW.created_by_user_id;

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
$function$;