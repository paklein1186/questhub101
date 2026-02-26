
-- Database function for territory-dataset matching logic
CREATE OR REPLACE FUNCTION public.match_territory_with_datasets(p_territory_id uuid)
RETURNS TABLE(
  dataset_id uuid,
  dataset_title text,
  dataset_source text,
  dataset_granularity text,
  match_level text,
  matched_at_granularity text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_precision territorial_precision_level;
  v_granularity territorial_granularity;
  v_auto_expand boolean;
  v_fallback_levels text[];
  v_current_level text;
  v_found boolean := false;
BEGIN
  -- Get territory settings
  SELECT t.precision_level, t.granularity, t.auto_expand_perimeter
  INTO v_precision, v_granularity, v_auto_expand
  FROM territories t WHERE t.id = p_territory_id;

  IF v_granularity IS NULL THEN
    -- Default based on territory level
    SELECT CASE
      WHEN t.level::text = 'TOWN' THEN 'DISTRICT_OR_COMMUNE'
      WHEN t.level::text = 'REGION' THEN 'NUTS2'
      WHEN t.level::text = 'NATIONAL' THEN 'COUNTRY'
      ELSE 'NUTS2'
    END INTO v_current_level
    FROM territories t WHERE t.id = p_territory_id;
  ELSE
    v_current_level := v_granularity::text;
  END IF;

  -- STRICT_MATCH: only exact granularity
  IF v_precision = 'STRICT_MATCH' THEN
    RETURN QUERY
      SELECT ed.id, ed.title, ed.source, ed.granularity::text, 
             'STRICT_MATCH'::text, v_current_level
      FROM environmental_datasets ed
      WHERE ed.is_active = true
        AND (
          (v_current_level = 'DISTRICT_OR_COMMUNE' AND ed.granularity = 'NUTS3')
          OR (v_current_level = 'NUTS3' AND ed.granularity = 'NUTS3')
          OR (v_current_level = 'NUTS2' AND ed.granularity = 'NUTS2')
          OR (v_current_level = 'NUTS1' AND ed.granularity = 'NUTS1')
          OR (v_current_level = 'COUNTRY' AND ed.granularity = 'COUNTRY')
          OR (ed.granularity = 'GLOBAL')
        );
    RETURN;
  END IF;

  -- PERIMETER_MATCH: try exact, then fallback up
  IF v_precision = 'PERIMETER_MATCH' OR v_precision IS NULL THEN
    v_fallback_levels := CASE v_current_level
      WHEN 'DISTRICT_OR_COMMUNE' THEN ARRAY['NUTS3', 'NUTS2', 'NUTS1', 'COUNTRY', 'GLOBAL']
      WHEN 'NUTS3' THEN ARRAY['NUTS3', 'NUTS2', 'NUTS1', 'COUNTRY', 'GLOBAL']
      WHEN 'NUTS2' THEN ARRAY['NUTS2', 'NUTS1', 'COUNTRY', 'GLOBAL']
      WHEN 'NUTS1' THEN ARRAY['NUTS1', 'COUNTRY', 'GLOBAL']
      WHEN 'COUNTRY' THEN ARRAY['COUNTRY', 'GLOBAL']
      WHEN 'CUSTOM_PERIMETER' THEN ARRAY['NUTS3', 'NUTS2', 'NUTS1', 'COUNTRY', 'GLOBAL']
      ELSE ARRAY['NUTS2', 'NUTS1', 'COUNTRY', 'GLOBAL']
    END;

    RETURN QUERY
      SELECT ed.id, ed.title, ed.source, ed.granularity::text,
             'PERIMETER_MATCH'::text,
             ed.granularity::text
      FROM environmental_datasets ed
      WHERE ed.is_active = true
        AND ed.granularity::text = ANY(v_fallback_levels);
    RETURN;
  END IF;

  -- BIOREGIONAL_MATCH: include bioregion datasets + fallback
  IF v_precision = 'BIOREGIONAL_MATCH' THEN
    v_fallback_levels := ARRAY['BIOREGION', 'NUTS2', 'NUTS1', 'COUNTRY', 'GLOBAL'];

    RETURN QUERY
      SELECT ed.id, ed.title, ed.source, ed.granularity::text,
             'BIOREGIONAL_MATCH'::text,
             ed.granularity::text
      FROM environmental_datasets ed
      WHERE ed.is_active = true
        AND ed.granularity::text = ANY(v_fallback_levels);
    RETURN;
  END IF;
END;
$$;

-- Function to update living system external data links
CREATE OR REPLACE FUNCTION public.update_living_system_external_data(p_natural_system_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_territory_id uuid;
  v_links jsonb := '[]'::jsonb;
BEGIN
  -- Get territory of this natural system
  SELECT ns.territory_id INTO v_territory_id
  FROM natural_systems ns WHERE ns.id = p_natural_system_id;

  IF v_territory_id IS NULL THEN RETURN; END IF;

  -- Get matched datasets
  SELECT jsonb_agg(jsonb_build_object(
    'dataset_id', m.dataset_id,
    'title', m.dataset_title,
    'source', m.dataset_source,
    'granularity', m.dataset_granularity,
    'match_level', m.match_level,
    'matched_at', m.matched_at_granularity,
    'linked_at', now()
  ))
  INTO v_links
  FROM match_territory_with_datasets(v_territory_id) m;

  -- Update natural system
  UPDATE natural_systems
  SET external_data_links = COALESCE(v_links, '[]'::jsonb),
      updated_at = now()
  WHERE id = p_natural_system_id;

  -- Also upsert territory_dataset_matches
  INSERT INTO territory_dataset_matches (territory_id, dataset_id, match_level, matched_granularity)
  SELECT v_territory_id, m.dataset_id, m.match_level, m.matched_at_granularity
  FROM match_territory_with_datasets(v_territory_id) m
  ON CONFLICT (territory_id, dataset_id) DO UPDATE
  SET match_level = EXCLUDED.match_level,
      matched_granularity = EXCLUDED.matched_granularity,
      updated_at = now();
END;
$$;

-- Trigger: auto-update external data when natural system is created/modified
CREATE OR REPLACE FUNCTION public.trigger_update_ns_external_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.territory_id IS NOT NULL THEN
    PERFORM update_living_system_external_data(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ns_external_data ON natural_systems;
CREATE TRIGGER trg_ns_external_data
  AFTER INSERT OR UPDATE OF territory_id ON natural_systems
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_ns_external_data();
