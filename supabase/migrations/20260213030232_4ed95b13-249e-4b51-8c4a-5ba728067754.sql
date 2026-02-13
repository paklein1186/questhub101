
-- ============================================================
-- FIX 1: set_user_role RPC - use auth.uid() instead of client-provided _actor_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_user_role(
  _target_user_id uuid,
  _role app_role,
  _grant boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _superadmin_count int;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(_actor_id, 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can modify roles';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF _role = 'superadmin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (_target_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  ELSE
    IF _role = 'superadmin' THEN
      SELECT count(*) INTO _superadmin_count
      FROM public.user_roles WHERE role = 'superadmin';
      IF _superadmin_count <= 1 THEN
        RAISE EXCEPTION 'Cannot remove the last superadmin';
      END IF;
    END IF;

    IF _role = 'admin' THEN
      IF public.has_role(_target_user_id, 'superadmin') THEN
        SELECT count(*) INTO _superadmin_count
        FROM public.user_roles WHERE role = 'superadmin';
        IF _superadmin_count <= 1 THEN
          RAISE EXCEPTION 'Cannot remove admin from the last superadmin';
        END IF;
        DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = 'superadmin';
      END IF;
    END IF;

    DELETE FROM public.user_roles WHERE user_id = _target_user_id AND role = _role;
  END IF;
END;
$$;

-- ============================================================
-- FIX 2: calendar_connections - create safe view, restrict SELECT
-- ============================================================
CREATE VIEW public.calendar_connections_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  provider,
  calendar_id,
  sync_enabled,
  last_synced_at,
  sync_error,
  token_expires_at,
  created_at,
  updated_at
FROM public.calendar_connections;

-- Drop the old permissive SELECT policy
DROP POLICY IF EXISTS "Users can view their own calendar connections" ON public.calendar_connections;

-- Create a restrictive SELECT that blocks client access (service_role bypasses RLS)
CREATE POLICY "No direct client SELECT on calendar_connections"
  ON public.calendar_connections FOR SELECT
  USING (false);

-- Add a SELECT policy on the safe view's underlying query via a new user-scoped policy
-- Since the view uses security_invoker, we need a policy that allows reading through the view
-- We'll use a policy that only allows reading own rows
DROP POLICY IF EXISTS "No direct client SELECT on calendar_connections" ON public.calendar_connections;

CREATE POLICY "Users can view own calendar connections metadata only"
  ON public.calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Actually we need a different approach: since we can't do column-level RLS,
-- we'll keep the user-scoped SELECT but clients MUST use the safe view.
-- The tokens are still accessible if someone queries the base table directly.
-- Better approach: deny all client SELECT, let view work via security_invoker=on won't work
-- because security_invoker uses the caller's permissions.
-- Best approach: use a SECURITY DEFINER function to serve safe data.

-- Let's clean up and use a function approach instead:
DROP VIEW IF EXISTS public.calendar_connections_safe;

-- Create a function that returns safe calendar connection data
CREATE OR REPLACE FUNCTION public.get_my_calendar_connections()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  provider text,
  calendar_id text,
  sync_enabled boolean,
  last_synced_at timestamptz,
  sync_error text,
  token_expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, user_id, provider, calendar_id, sync_enabled,
    last_synced_at, sync_error, token_expires_at, created_at, updated_at
  FROM public.calendar_connections
  WHERE user_id = auth.uid();
$$;

-- Now block direct SELECT access to the table
DROP POLICY IF EXISTS "Users can view own calendar connections metadata only" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can view their own calendar connections" ON public.calendar_connections;

-- No SELECT policy = no client access. Service role and SECURITY DEFINER functions still work.

-- ============================================================
-- FIX 3: credit_transactions - move to server-side RPC
-- ============================================================

-- Drop client INSERT policy for credit_transactions
DROP POLICY IF EXISTS "Users can insert own credit_transactions" ON public.credit_transactions;

-- Drop client INSERT policy for xp_events (same issue)
DROP POLICY IF EXISTS "Service role inserts xp_events" ON public.xp_events;

-- Drop client INSERT policy for xp_transactions
DROP POLICY IF EXISTS "Users can insert their own xp transactions" ON public.xp_transactions;

-- Create secure RPC for granting credits
CREATE OR REPLACE FUNCTION public.grant_user_credits(
  _target_user_id uuid,
  _amount integer,
  _type text,
  _source text DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _current_balance integer;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Only allow granting credits to yourself (or service role bypasses)
  IF _target_user_id != _actor_id THEN
    RAISE EXCEPTION 'Cannot grant credits to other users';
  END IF;
  
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Validate type against allowed types
  IF _type NOT IN ('INITIAL_GRANT', 'PURCHASE', 'REFERRAL_BONUS', 'QUEST_REWARD', 'ACHIEVEMENT_REWARD', 'MILESTONE_REWARD', 'ADMIN_GRANT') THEN
    RAISE EXCEPTION 'Invalid credit transaction type';
  END IF;

  -- Get current balance with row lock
  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles
  WHERE user_id = _target_user_id
  FOR UPDATE;

  -- Insert transaction
  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_target_user_id, _type, _amount, _source, _related_entity_type, _related_entity_id);

  -- Update balance
  UPDATE profiles
  SET credits_balance = _current_balance + _amount
  WHERE user_id = _target_user_id;
END;
$$;

-- Create secure RPC for spending credits
CREATE OR REPLACE FUNCTION public.spend_user_credits(
  _amount integer,
  _type text,
  _source text DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_balance integer;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Get current balance with row lock
  SELECT COALESCE(credits_balance, 0) INTO _current_balance
  FROM profiles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _current_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Insert negative transaction
  INSERT INTO credit_transactions (user_id, type, amount, source, related_entity_type, related_entity_id)
  VALUES (_user_id, _type, -_amount, _source, _related_entity_type, _related_entity_id);

  -- Update balance
  UPDATE profiles
  SET credits_balance = _current_balance - _amount
  WHERE user_id = _user_id;
END;
$$;

-- Create secure RPC for granting XP
CREATE OR REPLACE FUNCTION public.grant_user_xp(
  _target_user_id uuid,
  _type text,
  _amount integer,
  _topic_id uuid DEFAULT NULL,
  _territory_id uuid DEFAULT NULL,
  _related_entity_type text DEFAULT NULL,
  _related_entity_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_id uuid := auth.uid();
  _current_xp integer;
  _current_xp_recent integer;
  _new_level integer;
  _today_total integer;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _amount <= 0 THEN
    RETURN; -- silently ignore
  END IF;

  -- Daily cap check for COMMENT_UPVOTED
  IF _type = 'COMMENT_UPVOTED' THEN
    SELECT COALESCE(SUM(amount), 0) INTO _today_total
    FROM xp_events
    WHERE user_id = _target_user_id
      AND type = 'COMMENT_UPVOTED'
      AND created_at >= date_trunc('day', now());
    
    IF _today_total >= 50 THEN
      RETURN; -- cap reached
    END IF;
  END IF;

  -- Insert XP event
  INSERT INTO xp_events (user_id, type, amount, topic_id, territory_id, related_entity_type, related_entity_id)
  VALUES (_target_user_id, _type, _amount, _topic_id, _territory_id, _related_entity_type, _related_entity_id);

  -- Update profile totals
  SELECT COALESCE(xp, 0), COALESCE(xp_recent_12m, 0)
  INTO _current_xp, _current_xp_recent
  FROM profiles
  WHERE user_id = _target_user_id;

  _new_level := CASE
    WHEN (_current_xp + _amount) >= 10000 THEN 10
    WHEN (_current_xp + _amount) >= 7500 THEN 9
    WHEN (_current_xp + _amount) >= 5000 THEN 8
    WHEN (_current_xp + _amount) >= 3500 THEN 7
    WHEN (_current_xp + _amount) >= 2500 THEN 6
    WHEN (_current_xp + _amount) >= 1500 THEN 5
    WHEN (_current_xp + _amount) >= 800 THEN 4
    WHEN (_current_xp + _amount) >= 400 THEN 3
    WHEN (_current_xp + _amount) >= 100 THEN 2
    ELSE 1
  END;

  UPDATE profiles
  SET xp = _current_xp + _amount,
      xp_recent_12m = _current_xp_recent + _amount,
      xp_level = _new_level,
      contribution_index = (_current_xp + _amount) / 10
  WHERE user_id = _target_user_id;

  -- Legacy xp_transactions
  INSERT INTO xp_transactions (user_id, type, amount_xp, description, related_entity_type, related_entity_id)
  VALUES (_target_user_id, 'REWARD', _amount, _type, _related_entity_type, _related_entity_id);
END;
$$;

-- ============================================================
-- FIX 4: profiles - require authentication for SELECT
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Prevent users from directly updating their credits_balance and xp fields
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow service role (NULL auth.uid() in triggers from service role) or 
  -- prevent users from modifying financial/XP fields
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    -- User is updating their own profile - preserve sensitive fields
    NEW.credits_balance := OLD.credits_balance;
    NEW.xp := OLD.xp;
    NEW.xp_level := OLD.xp_level;
    NEW.xp_recent_12m := OLD.xp_recent_12m;
    NEW.contribution_index := OLD.contribution_index;
    NEW.total_shares_a := OLD.total_shares_a;
    NEW.total_shares_b := OLD.total_shares_b;
    NEW.governance_weight := OLD.governance_weight;
    NEW.is_cooperative_member := OLD.is_cooperative_member;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_sensitive_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();

-- ============================================================
-- FIX 5: bookings - create safe view excluding Stripe IDs
-- ============================================================
-- Since bookings RLS already restricts to participants, and the Stripe IDs
-- are needed by the participants for payment flows, this is lower risk.
-- We'll create a function to get bookings without sensitive payment details for general queries.
CREATE OR REPLACE FUNCTION public.get_my_bookings()
RETURNS TABLE (
  id uuid,
  service_id uuid,
  requester_id uuid,
  provider_user_id uuid,
  provider_guild_id uuid,
  company_id uuid,
  status text,
  requested_date_time timestamptz,
  start_date_time timestamptz,
  end_date_time timestamptz,
  notes text,
  amount numeric,
  currency text,
  payment_status text,
  call_url text,
  created_at timestamptz,
  updated_at timestamptz,
  is_deleted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id, b.service_id, b.requester_id, b.provider_user_id, b.provider_guild_id,
    b.company_id, b.status, b.requested_date_time, b.start_date_time, b.end_date_time,
    b.notes, b.amount, b.currency, b.payment_status, b.call_url,
    b.created_at, b.updated_at, b.is_deleted
  FROM public.bookings b
  WHERE (b.requester_id = auth.uid() OR b.provider_user_id = auth.uid())
    AND b.is_deleted = false;
$$;
