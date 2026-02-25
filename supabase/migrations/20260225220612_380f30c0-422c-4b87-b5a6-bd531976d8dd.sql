
-- Backfill quest_hosts for approved affiliations that have no corresponding host entry
INSERT INTO public.quest_hosts (quest_id, entity_type, entity_id, role, created_by_user_id)
SELECT qa.quest_id, qa.entity_type, qa.entity_id, 'CO_HOST', qa.created_by_user_id
FROM public.quest_affiliations qa
WHERE qa.status = 'APPROVED'
  AND NOT EXISTS (
    SELECT 1 FROM public.quest_hosts qh
    WHERE qh.quest_id = qa.quest_id
      AND qh.entity_type = qa.entity_type
      AND qh.entity_id = qa.entity_id
  )
ON CONFLICT (quest_id, entity_type, entity_id) DO NOTHING;
