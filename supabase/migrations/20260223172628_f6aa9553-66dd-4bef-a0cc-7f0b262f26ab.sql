
-- Add a renewal_notified_at column to track when renewal notification was sent
ALTER TABLE public.trust_edges ADD COLUMN IF NOT EXISTS renewal_notified_at timestamptz DEFAULT NULL;

-- Function to process trust renewals (called by edge function)
CREATE OR REPLACE FUNCTION public.process_trust_renewal(p_edge_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _edge RECORD;
  _target_name TEXT;
BEGIN
  -- Verify the edge belongs to the user
  SELECT * INTO _edge FROM trust_edges WHERE id = p_edge_id AND created_by = p_user_id AND status = 'active';
  IF _edge IS NULL THEN
    RETURN jsonb_build_object('error', 'Edge not found or not owned by you');
  END IF;

  -- Update last_confirmed_at
  UPDATE trust_edges
  SET last_confirmed_at = now(),
      updated_at = now(),
      renewal_notified_at = NULL,
      renewal_credit_granted = true
  WHERE id = p_edge_id;

  -- Grant +2 credits for renewal
  IF NOT _edge.renewal_credit_granted THEN
    INSERT INTO credit_transactions (user_id, amount, type, source, related_entity_type, related_entity_id)
    VALUES (p_user_id, 2, 'TRUST_RENEWAL', 'Trust attestation renewed', 'trust_edge', p_edge_id::text);

    -- Update user balance
    UPDATE profiles SET credits_balance = credits_balance + 2 WHERE user_id = p_user_id;
  END IF;

  -- Resolve target name for response
  IF _edge.to_node_type = 'profile' THEN
    SELECT name INTO _target_name FROM profiles WHERE user_id = _edge.to_node_id::uuid;
  ELSIF _edge.to_node_type = 'guild' THEN
    SELECT name INTO _target_name FROM guilds WHERE id = _edge.to_node_id::uuid;
  ELSIF _edge.to_node_type = 'quest' THEN
    SELECT title INTO _target_name FROM quests WHERE id = _edge.to_node_id::uuid;
  ELSIF _edge.to_node_type = 'service' THEN
    SELECT title INTO _target_name FROM services WHERE id = _edge.to_node_id::uuid;
  ELSIF _edge.to_node_type = 'partner_entity' THEN
    SELECT name INTO _target_name FROM companies WHERE id = _edge.to_node_id::uuid;
  END IF;

  RETURN jsonb_build_object('success', true, 'target_name', COALESCE(_target_name, 'Unknown'));
END;
$function$;
