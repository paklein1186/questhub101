CREATE OR REPLACE FUNCTION public.reward_facilitator_trust()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _is_facilitator BOOLEAN := false;
BEGIN
  IF NEW.from_node_type != 'profile' THEN RETURN NEW; END IF;
  IF NEW.status != 'active' THEN RETURN NEW; END IF;

  -- Check guild facilitator role via entity_member_roles + entity_roles
  IF NEW.context_guild_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM entity_member_roles emr
      JOIN entity_roles er ON er.id = emr.entity_role_id
      WHERE emr.user_id = NEW.created_by
        AND er.entity_id = NEW.context_guild_id::text
        AND er.entity_type = 'GUILD'
        AND lower(er.name) IN ('facilitator', 'facilitateur', 'facilitatrice')
    ) INTO _is_facilitator;
  END IF;

  -- Check quest facilitator
  IF NOT _is_facilitator AND NEW.context_quest_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM quest_participants qp
      WHERE qp.quest_id = NEW.context_quest_id
        AND qp.user_id = NEW.created_by
        AND qp.role = 'OWNER'
    ) INTO _is_facilitator;
  END IF;

  IF _is_facilitator THEN
    PERFORM public.grant_user_credits(
      NEW.created_by, 3, 'TRUST_EDGE_FACILITATOR',
      'Facilitator closure trust attestation', 'trust_edge', NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$function$;