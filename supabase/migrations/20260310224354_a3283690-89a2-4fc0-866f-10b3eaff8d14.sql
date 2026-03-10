
-- Fix natural_system_data_points: keep authenticated insert (no user column to scope)
DROP POLICY IF EXISTS "Authenticated users can insert data points" ON public.natural_system_data_points;
CREATE POLICY "Authenticated users can insert data points" ON public.natural_system_data_points
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Fix natural_system_indicators: keep authenticated (no user column)
DROP POLICY IF EXISTS "Authenticated users can update indicators" ON public.natural_system_indicators;
CREATE POLICY "Authenticated users can update indicators" ON public.natural_system_indicators
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can upsert indicators" ON public.natural_system_indicators;
CREATE POLICY "Authenticated users can upsert indicators" ON public.natural_system_indicators
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- contributor_exits: scope to own user
DROP POLICY IF EXISTS "Authenticated users can insert exits" ON public.contributor_exits;
CREATE POLICY "Authenticated users can insert exits" ON public.contributor_exits
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can update exits" ON public.contributor_exits;
CREATE POLICY "Authenticated users can update exits" ON public.contributor_exits
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = exit_initiated_by)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = exit_initiated_by);

-- coin_transactions: scope to own user
DROP POLICY IF EXISTS "Insert gameb transactions" ON public.coin_transactions;
CREATE POLICY "Insert gameb transactions" ON public.coin_transactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix all SECURITY DEFINER functions missing search_path (re-apply since migration failed)

CREATE OR REPLACE FUNCTION public.get_linked_natural_systems(p_linked_type ns_link_type, p_linked_id uuid)
 RETURNS TABLE(id uuid, name text, kingdom text, system_type text, territory_id uuid, location_text text, description text, picture_url text, source_url text, tags text[], health_index numeric, resilience_index numeric, regenerative_potential numeric, linked_via text, link_created_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT ns.id, ns.name, ns.kingdom::text, ns.system_type,
    ns.territory_id, ns.location_text, ns.description,
    ns.picture_url, ns.source_url, ns.tags,
    ns.health_index, ns.resilience_index, ns.regenerative_potential,
    nsl.linked_via, nsl.created_at,
    ns.created_at, ns.updated_at
  FROM natural_system_links nsl
  JOIN natural_systems ns ON ns.id = nsl.natural_system_id AND ns.is_deleted = false
  WHERE nsl.linked_type = p_linked_type AND nsl.linked_id = p_linked_id
  ORDER BY ns.name;
$function$;

CREATE OR REPLACE FUNCTION public.map_territory_to_eco_region(p_territory_id uuid)
 RETURNS TABLE(eco_region_code text, eco_region_name text, eco_region_scheme text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_country_code text;
  v_nuts_code text;
  v_granularity text;
BEGIN
  SELECT t.country_code, t.nuts_code, t.granularity::text
  INTO v_country_code, v_nuts_code, v_granularity
  FROM public.territories t
  WHERE t.id = p_territory_id AND t.is_deleted = false;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_nuts_code IS NOT NULL THEN
    RETURN QUERY SELECT erl.eco_region_code, erl.eco_region_name, erl.eco_region_scheme
      FROM public.eco_region_lookup erl WHERE erl.code_admin = v_nuts_code AND erl.admin_level = v_granularity LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  IF v_country_code IS NOT NULL THEN
    RETURN QUERY SELECT erl.eco_region_code, erl.eco_region_name, erl.eco_region_scheme
      FROM public.eco_region_lookup erl WHERE erl.code_admin = v_country_code AND erl.admin_level = 'COUNTRY' LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.propagate_ns_link_to_ancestors()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NEW.linked_type = 'territory'::ns_link_type THEN
    INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    SELECT NEW.natural_system_id, 'territory'::ns_link_type, tc.ancestor_id, 'territory_hierarchy'
    FROM public.territory_closure tc WHERE tc.descendant_id = NEW.linked_id AND tc.depth > 0
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.propagate_ns_territory_to_ancestors()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF NEW.territory_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.territory_id IS DISTINCT FROM NEW.territory_id) THEN
    INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    VALUES (NEW.id, 'territory'::ns_link_type, NEW.territory_id, 'manual')
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
    INSERT INTO public.natural_system_links (natural_system_id, linked_type, linked_id, linked_via)
    SELECT NEW.id, 'territory'::ns_link_type, tc.ancestor_id, 'territory_hierarchy'
    FROM public.territory_closure tc WHERE tc.descendant_id = NEW.territory_id AND tc.depth > 0
    ON CONFLICT (natural_system_id, linked_type, linked_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.compute_contribution_fmv(p_type contribution_type_enum, p_fmv_input jsonb, p_guild_fmv_rate numeric, p_cash_multiplier numeric, p_difficulty text DEFAULT 'STANDARD'::text)
 RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $function$
DECLARE result NUMERIC := 0; diff_mult NUMERIC;
BEGIN
  diff_mult := CASE p_difficulty WHEN 'STANDARD' THEN 1.0 WHEN 'COMPLEX' THEN 1.5 WHEN 'EXPERT' THEN 2.0 WHEN 'EXCEPTIONAL' THEN 3.0 ELSE 1.0 END;
  CASE p_type
    WHEN 'TIME' THEN result := COALESCE((p_fmv_input->>'half_days')::NUMERIC, 0) * p_guild_fmv_rate * diff_mult;
    WHEN 'EXPENSES', 'SUPPLIES', 'EQUIPMENT', 'FACILITIES' THEN result := COALESCE((p_fmv_input->>'amount_eur')::NUMERIC, 0) * p_cash_multiplier;
    WHEN 'SALES' THEN result := COALESCE((p_fmv_input->>'deal_value_eur')::NUMERIC, 0) * COALESCE((p_fmv_input->>'commission_pct')::NUMERIC, 0) / 100.0;
    WHEN 'FINDERS_FEE' THEN result := COALESCE((p_fmv_input->>'deal_value_eur')::NUMERIC, 0) * COALESCE((p_fmv_input->>'finders_pct')::NUMERIC, 0) / 100.0;
    WHEN 'ROYALTY', 'OTHER' THEN result := COALESCE((p_fmv_input->>'amount_eur')::NUMERIC, 0);
  END CASE;
  RETURN ROUND(result, 2);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_ctg_in_escrow(p_user_id uuid)
 RETURNS numeric LANGUAGE sql STABLE SET search_path = public
AS $function$
  SELECT COALESCE(SUM(qfc.amount), 0)
  FROM public.quest_funding_contributions qfc
  JOIN public.quests q ON qfc.quest_id = q.id
  WHERE qfc.funder_user_id = p_user_id AND qfc.currency = 'ctg' AND qfc.refunded_at IS NULL AND q.ctg_escrow_status = 'active';
$function$;

CREATE OR REPLACE FUNCTION public.trg_compute_contribution_fmv()
 RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
DECLARE g_rate NUMERIC; g_mult NUMERIC;
BEGIN
  SELECT fmv_rate_per_half_day, cash_multiplier INTO g_rate, g_mult FROM public.guilds WHERE id = NEW.guild_id;
  IF NEW.cash_multiplier IS NOT NULL THEN g_mult := NEW.cash_multiplier; END IF;
  g_rate := COALESCE(g_rate, 200); g_mult := COALESCE(g_mult, 2.00);
  NEW.fmv_value := public.compute_contribution_fmv(NEW.contribution_type, NEW.fmv_input, g_rate, g_mult, COALESCE((NEW.fmv_input->>'difficulty')::TEXT, 'STANDARD'));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_assistant_message_role()
 RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
BEGIN
  IF NEW.role NOT IN ('user', 'assistant', 'system') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be user, assistant, or system.', NEW.role;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_contributor_exit()
 RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $function$
BEGIN
  IF NEW.settlement_status NOT IN ('pending', 'paid', 'waived') THEN
    RAISE EXCEPTION 'Invalid settlement_status: %', NEW.settlement_status;
  END IF;
  IF NEW.settlement_pct < 0 OR NEW.settlement_pct > 100 THEN
    RAISE EXCEPTION 'settlement_pct must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$function$;
