-- Fix: Recreate profiles_public view with SECURITY INVOKER
-- so it uses the querying user's RLS policies instead of the view creator's

-- Step 1: Add a policy allowing authenticated users to read all profiles
-- (the profiles_public view already limits which columns are exposed)
CREATE POLICY "Authenticated users can read all profiles via public view"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: Drop and recreate the view with security_invoker = true
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  user_id,
  name,
  avatar_url,
  headline,
  bio,
  role,
  xp,
  xp_level,
  xp_recent_12m,
  contribution_index,
  has_completed_onboarding,
  created_at,
  updated_at,
  current_plan_code,
  total_shares_a,
  total_shares_b,
  governance_weight,
  is_cooperative_member,
  filter_by_houses,
  allow_wall_comments,
  persona_type,
  location
FROM profiles;

-- Step 3: Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;