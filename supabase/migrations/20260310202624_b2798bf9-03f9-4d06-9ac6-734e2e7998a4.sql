
-- MIGRATION 10D: CTG escrow demurrage freeze function

CREATE OR REPLACE FUNCTION public.get_user_ctg_in_escrow(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(qfc.amount), 0)
  FROM public.quest_funding_contributions qfc
  JOIN public.quests q ON qfc.quest_id = q.id
  WHERE qfc.funder_user_id = p_user_id
    AND qfc.currency = 'ctg'
    AND qfc.refunded_at IS NULL
    AND q.ctg_escrow_status = 'active';
$$ LANGUAGE SQL STABLE;
