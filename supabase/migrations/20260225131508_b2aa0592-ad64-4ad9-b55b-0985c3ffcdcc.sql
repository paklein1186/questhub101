
-- Recompute indicators for a single natural system
CREATE OR REPLACE FUNCTION public.recompute_natural_system_indicators(p_natural_system_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _metric_count int;
  _avg_value double precision;
  _min_value double precision;
  _max_value double precision;
  _stddev double precision;
  _health double precision := 50;
  _stress double precision := 50;
  _has_data boolean := false;
BEGIN
  -- Count distinct metrics with data in last 30 days
  SELECT count(DISTINCT metric), avg(value), min(value), max(value), stddev(value)
  INTO _metric_count, _avg_value, _min_value, _max_value, _stddev
  FROM natural_system_data_points
  WHERE natural_system_id = p_natural_system_id
    AND recorded_at >= now() - interval '30 days';

  _has_data := (_metric_count > 0);

  IF _has_data THEN
    -- Simple heuristic health: more metrics + lower variance = healthier
    -- Normalize stddev relative to range
    IF _max_value > _min_value AND _stddev IS NOT NULL THEN
      -- coefficient of variation approach: lower CV = more stable = healthier
      _stress := LEAST(100, GREATEST(0, (_stddev / GREATEST(abs(_avg_value), 0.01)) * 100));
      _health := LEAST(100, GREATEST(0, 100 - _stress * 0.6));
    ELSE
      _health := 60; -- stable single-value readings
      _stress := 20;
    END IF;

    -- Bonus for diversity of metrics being tracked
    _health := LEAST(100, _health + LEAST(_metric_count * 2, 10));
  END IF;

  -- Upsert health_index indicator
  INSERT INTO natural_system_indicators (natural_system_id, indicator, value, computed_at)
  VALUES (p_natural_system_id, 'health_index', round(_health::numeric, 1), now())
  ON CONFLICT (natural_system_id, indicator)
  DO UPDATE SET value = EXCLUDED.value, computed_at = EXCLUDED.computed_at;

  -- Upsert stress_index indicator
  INSERT INTO natural_system_indicators (natural_system_id, indicator, value, computed_at)
  VALUES (p_natural_system_id, 'stress_index', round(_stress::numeric, 1), now())
  ON CONFLICT (natural_system_id, indicator)
  DO UPDATE SET value = EXCLUDED.value, computed_at = EXCLUDED.computed_at;

  -- Update cached health_index on natural_systems
  UPDATE natural_systems
  SET health_index = round(_health::numeric)::int,
      updated_at = now()
  WHERE id = p_natural_system_id;
END;
$$;

-- Batch recompute for all systems with recent data
CREATE OR REPLACE FUNCTION public.recompute_all_indicators()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  _count int := 0;
  _ns_id uuid;
BEGIN
  FOR _ns_id IN
    SELECT DISTINCT natural_system_id
    FROM natural_system_data_points
    WHERE recorded_at >= now() - interval '7 days'
  LOOP
    PERFORM recompute_natural_system_indicators(_ns_id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;
