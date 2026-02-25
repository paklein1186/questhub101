
-- Indexes for performance (skip open_trust_edges which is a view)
CREATE INDEX IF NOT EXISTS idx_natural_systems_territory_id ON public.natural_systems (territory_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quest_territories_territory_id ON public.quest_territories (territory_id);
CREATE INDEX IF NOT EXISTS idx_quest_territories_quest_id ON public.quest_territories (quest_id);
CREATE INDEX IF NOT EXISTS idx_biopoints_transactions_ns ON public.biopoints_transactions (natural_system_id) WHERE natural_system_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- RPC: get_territory_natural_systems
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_territory_natural_systems(p_territory_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  kingdom text,
  system_type text,
  health_index integer,
  resilience_index integer,
  regenerative_potential integer,
  picture_url text,
  description text,
  tags text[],
  location_text text,
  source_url text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    ns.id, ns.name,
    ns.kingdom::text, ns.system_type::text,
    ns.health_index, ns.resilience_index, ns.regenerative_potential,
    ns.picture_url,
    LEFT(ns.description, 300) AS description,
    ns.tags, ns.location_text, ns.source_url, ns.created_at
  FROM natural_systems ns
  WHERE ns.territory_id = p_territory_id
    AND ns.is_deleted = false
  ORDER BY ns.health_index ASC, ns.name;
$$;

-- ═══════════════════════════════════════════════════════════════
-- RPC: get_territory_living_dashboard
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_territory_living_dashboard(p_territory_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
  _ns_count int;
  _ns_by_type jsonb;
  _avg_health numeric;
  _critical int; _stressed int; _stable int; _thriving int;
  _eco_q_30 int; _eco_q_done_30 int;
  _stewards_30 int; _guilds_30 int;
  _credits_budgeted_90 bigint; _credits_spent_90 bigint;
  _xp_90 bigint; _bio_90 bigint;
  _top_users jsonb; _top_guilds jsonb; _mini_graph jsonb;
BEGIN
  -- ── Natural systems by type ──
  SELECT COALESCE(jsonb_object_agg(system_type::text, c), '{}'::jsonb)
  INTO _ns_by_type
  FROM (
    SELECT system_type, count(*) AS c
    FROM natural_systems
    WHERE territory_id = p_territory_id AND is_deleted = false
    GROUP BY system_type
  ) x;

  -- ── Natural systems health stats ──
  SELECT count(*),
         COALESCE(round(avg(health_index), 1), 0),
         count(*) FILTER (WHERE health_index < 30),
         count(*) FILTER (WHERE health_index >= 30 AND health_index < 60),
         count(*) FILTER (WHERE health_index >= 60 AND health_index < 80),
         count(*) FILTER (WHERE health_index >= 80)
  INTO _ns_count, _avg_health, _critical, _stressed, _stable, _thriving
  FROM natural_systems
  WHERE territory_id = p_territory_id AND is_deleted = false;

  -- ── Eco-quests (last 30d) ──
  WITH eco_quests AS (
    SELECT q.id, q.status, q.guild_id, q.company_id
    FROM quests q
    JOIN quest_territories qt ON qt.quest_id = q.id AND qt.territory_id = p_territory_id
    WHERE q.natural_system_id IS NOT NULL
      AND q.is_deleted = false
      AND q.created_at >= now() - interval '30 days'
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'COMPLETED'),
    (SELECT count(DISTINCT qp.user_id) FROM quest_participants qp WHERE qp.quest_id IN (SELECT eq.id FROM eco_quests eq)),
    (SELECT count(DISTINCT g) FROM eco_quests eq, LATERAL (VALUES (eq.guild_id), (eq.company_id)) AS v(g) WHERE g IS NOT NULL)
  INTO _eco_q_30, _eco_q_done_30, _stewards_30, _guilds_30
  FROM eco_quests;

  -- ── Credits (last 90d) ──
  WITH eco_q_90 AS (
    SELECT q.id, COALESCE(q.credit_budget, 0) AS cb, q.status
    FROM quests q
    JOIN quest_territories qt ON qt.quest_id = q.id AND qt.territory_id = p_territory_id
    WHERE q.natural_system_id IS NOT NULL AND q.is_deleted = false
      AND q.created_at >= now() - interval '90 days'
  )
  SELECT
    COALESCE(sum(cb), 0),
    COALESCE(sum(cb) FILTER (WHERE status = 'COMPLETED'), 0)
  INTO _credits_budgeted_90, _credits_spent_90
  FROM eco_q_90;

  -- ── XP from eco-quests (last 90d) ──
  SELECT COALESCE(sum(xe.amount), 0)
  INTO _xp_90
  FROM xp_events xe
  WHERE xe.territory_id = p_territory_id
    AND xe.created_at >= now() - interval '90 days';

  -- ── Biopoints (last 90d) ──
  SELECT COALESCE(sum(bt.amount), 0)
  INTO _bio_90
  FROM biopoints_transactions bt
  JOIN natural_systems ns ON ns.id = bt.natural_system_id
  WHERE ns.territory_id = p_territory_id
    AND bt.created_at >= now() - interval '90 days'
    AND bt.amount > 0;

  -- ── Top steward users (from OTG edges) ──
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO _top_users
  FROM (
    SELECT
      ote.from_id AS user_id,
      COALESCE(p.name, '') AS display_name,
      round(sum(ote.weight)::numeric, 2) AS total_steward_weight,
      count(DISTINCT qp.quest_id) AS eco_quests_count
    FROM open_trust_edges ote
    JOIN natural_systems ns ON ns.id = ote.to_id AND ns.territory_id = p_territory_id AND ns.is_deleted = false
    LEFT JOIN profiles p ON p.user_id = ote.from_id
    LEFT JOIN quest_participants qp ON qp.user_id = ote.from_id
      AND qp.quest_id IN (
        SELECT q.id FROM quests q
        JOIN quest_territories qt ON qt.quest_id = q.id AND qt.territory_id = p_territory_id
        WHERE q.natural_system_id IS NOT NULL AND q.is_deleted = false
      )
    WHERE ote.from_type = 'profile'
      AND ote.to_type = 'natural_system'
      AND ote.edge_type = 'steward_of'
      AND ote.status = 'active'
    GROUP BY ote.from_id, p.name
    ORDER BY total_steward_weight DESC
    LIMIT 10
  ) t;

  -- ── Top steward guilds ──
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO _top_guilds
  FROM (
    SELECT
      ote.from_id AS guild_id,
      COALESCE(g.name, c.name, '') AS name,
      round(sum(ote.weight)::numeric, 2) AS total_steward_weight,
      0 AS eco_quests_count
    FROM open_trust_edges ote
    JOIN natural_systems ns ON ns.id = ote.to_id AND ns.territory_id = p_territory_id AND ns.is_deleted = false
    LEFT JOIN guilds g ON g.id = ote.from_id
    LEFT JOIN companies c ON c.id = ote.from_id
    WHERE ote.from_type IN ('guild', 'company')
      AND ote.to_type = 'natural_system'
      AND ote.edge_type = 'steward_of'
      AND ote.status = 'active'
    GROUP BY ote.from_id, g.name, c.name
    ORDER BY total_steward_weight DESC
    LIMIT 10
  ) t;

  -- ── Mini OTG graph ──
  WITH ns_ids AS (
    SELECT id FROM natural_systems WHERE territory_id = p_territory_id AND is_deleted = false
  ),
  relevant_edges AS (
    SELECT ote.from_type, ote.from_id, ote.to_type, ote.to_id, ote.edge_type, ote.weight
    FROM open_trust_edges ote
    WHERE ote.status = 'active'
      AND (
        (ote.to_id IN (SELECT id FROM ns_ids) AND ote.to_type = 'natural_system')
        OR ote.context_territory_id = p_territory_id
      )
    LIMIT 200
  ),
  nodes AS (
    SELECT DISTINCT node_type, node_id FROM (
      SELECT from_type AS node_type, from_id AS node_id FROM relevant_edges
      UNION ALL
      SELECT to_type, to_id FROM relevant_edges
      UNION ALL
      SELECT 'territory', p_territory_id
    ) x
  )
  SELECT jsonb_build_object(
    'nodes', COALESCE((SELECT jsonb_agg(jsonb_build_object('type', node_type, 'id', node_id)) FROM nodes), '[]'::jsonb),
    'edges', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'from_type', from_type, 'from_id', from_id,
      'to_type', to_type, 'to_id', to_id,
      'edge_type', edge_type, 'weight', round(weight::numeric, 3)
    )) FROM relevant_edges), '[]'::jsonb)
  )
  INTO _mini_graph;

  -- ── Assemble result ──
  _result := jsonb_build_object(
    'natural_systems_count', _ns_count,
    'natural_systems_by_type', _ns_by_type,
    'avg_health_index', _avg_health,
    'critical_systems_count', _critical,
    'stressed_systems_count', _stressed,
    'stable_systems_count', _stable,
    'thriving_systems_count', _thriving,
    'eco_quests_last_30d', _eco_q_30,
    'eco_quests_completed_last_30d', _eco_q_done_30,
    'unique_stewards_last_30d', _stewards_30,
    'active_guilds_last_30d', _guilds_30,
    'credits_budgeted_last_90d', _credits_budgeted_90,
    'credits_spent_last_90d', _credits_spent_90,
    'xp_from_eco_quests_last_90d', _xp_90,
    'biopoints_distributed_last_90d', _bio_90,
    'top_steward_users', _top_users,
    'top_steward_guilds', _top_guilds,
    'mini_otg_graph', _mini_graph
  );

  RETURN _result;
END;
$$;
