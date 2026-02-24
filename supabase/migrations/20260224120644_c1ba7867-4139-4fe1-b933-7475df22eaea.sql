
-- Create the unified graph_edges view
CREATE OR REPLACE VIEW public.graph_edges AS

-- 1. Follows
SELECT
  f.id,
  f.follower_id AS source_id,
  'user'::text AS source_type,
  f.target_id::uuid AS target_id,
  LOWER(f.target_type)::text AS target_type,
  'follows'::text AS relation_type,
  0.2::numeric AS weight,
  'public'::text AS visibility,
  f.created_at,
  f.created_at AS updated_at
FROM public.follows f

UNION ALL

-- 2. Guild members
SELECT
  gm.id,
  gm.user_id AS source_id,
  'user'::text AS source_type,
  gm.guild_id AS target_id,
  'guild'::text AS target_type,
  CASE WHEN gm.role::text = 'ADMIN' THEN 'steward_of' ELSE 'member_of' END AS relation_type,
  CASE WHEN gm.role::text = 'ADMIN' THEN 0.9 ELSE 0.5 END::numeric AS weight,
  'public'::text AS visibility,
  gm.joined_at AS created_at,
  gm.joined_at AS updated_at
FROM public.guild_members gm

UNION ALL

-- 3. Company members
SELECT
  cm.id,
  cm.user_id AS source_id,
  'user'::text AS source_type,
  cm.company_id AS target_id,
  'org'::text AS target_type,
  CASE WHEN cm.role = 'ADMIN' THEN 'steward_of' ELSE 'member_of' END AS relation_type,
  CASE WHEN cm.role = 'ADMIN' THEN 0.9 ELSE 0.5 END::numeric AS weight,
  'public'::text AS visibility,
  cm.joined_at AS created_at,
  cm.joined_at AS updated_at
FROM public.company_members cm

UNION ALL

-- 4. Quest participants
SELECT
  qp.id,
  qp.user_id AS source_id,
  'user'::text AS source_type,
  qp.quest_id AS target_id,
  'quest'::text AS target_type,
  CASE WHEN qp.role = 'ADMIN' THEN 'quest_owner' ELSE 'member_of' END AS relation_type,
  CASE WHEN qp.role = 'ADMIN' THEN 0.8 ELSE 0.4 END::numeric AS weight,
  'public'::text AS visibility,
  qp.created_at,
  qp.created_at AS updated_at
FROM public.quest_participants qp
WHERE qp.status = 'APPROVED'

UNION ALL

-- 5. Pod members
SELECT
  pm.id,
  pm.user_id AS source_id,
  'user'::text AS source_type,
  pm.pod_id AS target_id,
  'pod'::text AS target_type,
  CASE WHEN pm.role::text = 'HOST' THEN 'steward_of' ELSE 'member_of' END AS relation_type,
  CASE WHEN pm.role::text = 'HOST' THEN 0.8 ELSE 0.4 END::numeric AS weight,
  'public'::text AS visibility,
  pm.joined_at AS created_at,
  pm.joined_at AS updated_at
FROM public.pod_members pm

UNION ALL

-- 6. Partnerships (accepted only)
SELECT
  p.id,
  p.from_entity_id AS source_id,
  LOWER(p.from_entity_type)::text AS source_type,
  p.to_entity_id AS target_id,
  LOWER(p.to_entity_type)::text AS target_type,
  'partner'::text AS relation_type,
  0.7::numeric AS weight,
  'public'::text AS visibility,
  p.created_at,
  p.updated_at
FROM public.partnerships p
WHERE p.status = 'ACCEPTED'

UNION ALL

-- 7. Guild-territory associations
SELECT
  gt.id,
  gt.guild_id AS source_id,
  'guild'::text AS source_type,
  gt.territory_id AS target_id,
  'territory'::text AS target_type,
  'located_in'::text AS relation_type,
  CASE WHEN gt.is_primary THEN 0.8 ELSE 0.4 END::numeric AS weight,
  'public'::text AS visibility,
  now() AS created_at,
  now() AS updated_at
FROM public.guild_territories gt

UNION ALL

-- 8. Company-territory associations
SELECT
  ct.id,
  ct.company_id AS source_id,
  'org'::text AS source_type,
  ct.territory_id AS target_id,
  'territory'::text AS target_type,
  'located_in'::text AS relation_type,
  CASE WHEN ct.is_primary THEN 0.8 ELSE 0.4 END::numeric AS weight,
  'public'::text AS visibility,
  now() AS created_at,
  now() AS updated_at
FROM public.company_territories ct

UNION ALL

-- 9. Quest funding
SELECT
  qf.id,
  qf.funder_user_id AS source_id,
  'user'::text AS source_type,
  qf.quest_id AS target_id,
  'quest'::text AS target_type,
  'funds'::text AS relation_type,
  LEAST(1.0, qf.amount::numeric / 500.0) AS weight,
  'public'::text AS visibility,
  qf.created_at,
  qf.updated_at
FROM public.quest_funding qf
WHERE qf.funder_user_id IS NOT NULL AND qf.status = 'PAID'

UNION ALL

-- 10. Trust edges (normalized score 1-5 → 0-1)
SELECT
  te.id,
  te.from_node_id AS source_id,
  LOWER(te.from_node_type::text)::text AS source_type,
  te.to_node_id AS target_id,
  LOWER(te.to_node_type::text)::text AS target_type,
  'trust'::text AS relation_type,
  (te.score::numeric / 5.0) AS weight,
  te.visibility::text AS visibility,
  te.created_at,
  te.updated_at
FROM public.trust_edges te
WHERE te.status = 'active';

-- Grant access
GRANT SELECT ON public.graph_edges TO authenticated, anon;
