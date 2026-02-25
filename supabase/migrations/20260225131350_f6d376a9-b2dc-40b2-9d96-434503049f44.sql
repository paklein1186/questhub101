
-- 1. natural_system_data_points: time-series raw metrics
CREATE TABLE public.natural_system_data_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  natural_system_id uuid NOT NULL REFERENCES public.natural_systems(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value double precision NOT NULL,
  unit text,
  source text DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_nsdp_system_metric_time ON public.natural_system_data_points (natural_system_id, metric, recorded_at DESC);
CREATE INDEX idx_nsdp_recorded_at ON public.natural_system_data_points (recorded_at DESC);

-- 2. natural_system_indicators: aggregated / derived values
CREATE TABLE public.natural_system_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  natural_system_id uuid NOT NULL REFERENCES public.natural_systems(id) ON DELETE CASCADE,
  indicator text NOT NULL,
  value double precision NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nsi_system_indicator ON public.natural_system_indicators (natural_system_id, indicator, computed_at DESC);
-- Unique constraint for "latest" upsert pattern
CREATE UNIQUE INDEX idx_nsi_system_indicator_unique ON public.natural_system_indicators (natural_system_id, indicator);

-- 3. Add live_config jsonb to natural_systems
ALTER TABLE public.natural_systems
  ADD COLUMN IF NOT EXISTS live_config jsonb DEFAULT NULL;

COMMENT ON COLUMN public.natural_systems.live_config IS 'JSON config for external data sources: endpoints, metric mappings, refresh frequency hints';

-- 4a. RPC: get_recent_data_points
CREATE OR REPLACE FUNCTION public.get_recent_data_points(
  p_natural_system_id uuid,
  p_metric text DEFAULT NULL,
  p_since timestamptz DEFAULT (now() - interval '30 days'),
  p_limit integer DEFAULT 500
)
RETURNS TABLE (
  id uuid,
  metric text,
  value double precision,
  unit text,
  source text,
  recorded_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT dp.id, dp.metric, dp.value, dp.unit, dp.source, dp.recorded_at
  FROM natural_system_data_points dp
  WHERE dp.natural_system_id = p_natural_system_id
    AND dp.recorded_at >= p_since
    AND (p_metric IS NULL OR dp.metric = p_metric)
  ORDER BY dp.recorded_at DESC
  LIMIT p_limit;
$$;

-- 4b. RPC: get_latest_indicator
CREATE OR REPLACE FUNCTION public.get_latest_indicator(
  p_natural_system_id uuid,
  p_indicator text DEFAULT NULL
)
RETURNS TABLE (
  indicator text,
  value double precision,
  computed_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT i.indicator, i.value, i.computed_at
  FROM natural_system_indicators i
  WHERE i.natural_system_id = p_natural_system_id
    AND (p_indicator IS NULL OR i.indicator = p_indicator)
  ORDER BY i.computed_at DESC;
$$;

-- 5. RLS policies
ALTER TABLE public.natural_system_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.natural_system_indicators ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Authenticated users can read data points"
  ON public.natural_system_data_points FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert data points"
  ON public.natural_system_data_points FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read indicators"
  ON public.natural_system_indicators FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can upsert indicators"
  ON public.natural_system_indicators FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update indicators"
  ON public.natural_system_indicators FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for data points (useful for live dashboards)
ALTER PUBLICATION supabase_realtime ADD TABLE public.natural_system_data_points;
