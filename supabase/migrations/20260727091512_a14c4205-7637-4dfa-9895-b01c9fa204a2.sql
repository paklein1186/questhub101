WITH pairs AS (
  SELECT c.id, c.updated_at,
    array_agg(p.user_id ORDER BY p.user_id) AS users,
    (SELECT count(*) FROM public.direct_messages m WHERE m.conversation_id = c.id) AS msgs
  FROM public.conversations c
  JOIN public.conversation_participants p ON p.conversation_id = c.id
  WHERE c.is_group = false
  GROUP BY c.id, c.updated_at
  HAVING count(*) = 2
), ranked AS (
  SELECT id, users, msgs,
    row_number() OVER (PARTITION BY users ORDER BY msgs DESC, updated_at DESC) AS rn
  FROM pairs
)
DELETE FROM public.conversations c
USING ranked r
WHERE c.id = r.id AND r.rn > 1 AND r.msgs = 0;