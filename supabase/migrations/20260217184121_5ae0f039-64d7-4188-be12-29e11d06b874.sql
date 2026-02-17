
-- Add funding_type to quests (CREDITS or FIAT)
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS funding_type TEXT NOT NULL DEFAULT 'CREDITS';

-- Add fundraising_cancelled flag
ALTER TABLE public.quests ADD COLUMN IF NOT EXISTS fundraising_cancelled BOOLEAN NOT NULL DEFAULT false;

-- Add refund status to quest_funding
ALTER TABLE public.quest_funding ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- RPC to refund all quest funding contributors
CREATE OR REPLACE FUNCTION public.refund_quest_funding(_quest_id UUID)
RETURNS TABLE(refunded_count INTEGER, refunded_total INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _actor_id UUID := auth.uid();
  _quest RECORD;
  _funding RECORD;
  _total_refunded INTEGER := 0;
  _count INTEGER := 0;
  _is_admin BOOLEAN;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get quest
  SELECT id, created_by_user_id, escrow_credits, funding_type INTO _quest
  FROM public.quests WHERE id = _quest_id;

  IF _quest IS NULL THEN
    RAISE EXCEPTION 'Quest not found';
  END IF;

  -- Check authorization: must be quest owner or platform admin
  _is_admin := public.has_role(_actor_id, 'admin');
  IF _quest.created_by_user_id != _actor_id AND NOT _is_admin THEN
    RAISE EXCEPTION 'Not authorized to refund this quest';
  END IF;

  -- Only refund credit-type funding
  IF _quest.funding_type != 'CREDITS' THEN
    RAISE EXCEPTION 'Only credit-funded quests can be refunded through this function';
  END IF;

  -- Process each unrefunded funding entry
  FOR _funding IN
    SELECT id, funder_user_id, amount
    FROM public.quest_funding
    WHERE quest_id = _quest_id
      AND status = 'PAID'
      AND type = 'CREDITS'
      AND refunded_at IS NULL
      AND funder_user_id IS NOT NULL
  LOOP
    -- Return credits to funder
    UPDATE public.profiles
    SET credits_balance = credits_balance + _funding.amount
    WHERE user_id = _funding.funder_user_id;

    -- Log the refund transaction
    INSERT INTO public.credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
    VALUES (_funding.funder_user_id, 'QUEST_FUNDING_REFUND', _funding.amount, 'Quest funding refunded', 'quest', _quest_id::text);

    -- Mark funding as refunded
    UPDATE public.quest_funding
    SET refunded_at = now(), status = 'REFUNDED', updated_at = now()
    WHERE id = _funding.id;

    _total_refunded := _total_refunded + _funding.amount;
    _count := _count + 1;
  END LOOP;

  -- Also refund the creator's initial credit_budget if escrow > 0
  -- Reset escrow to 0
  UPDATE public.quests
  SET escrow_credits = 0, fundraising_cancelled = true, updated_at = now()
  WHERE id = _quest_id;

  RETURN QUERY SELECT _count, _total_refunded;
END;
$function$;
