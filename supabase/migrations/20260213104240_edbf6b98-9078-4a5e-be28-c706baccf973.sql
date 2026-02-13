
-- 1. Drop the overly permissive SELECT policy on profiles
DROP POLICY "Authenticated users can read profiles" ON public.profiles;

-- 2. Create owner-only SELECT policy
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Admin SELECT policy for admin dashboards
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Recreate profiles_public view with additional fields needed by the app
-- This is intentionally SECURITY DEFINER (default) to bypass owner-only RLS
-- It excludes sensitive fields: email, credits_balance, persona_confidence,
-- persona_source, website_url, twitter_url, linkedin_url, instagram_url,
-- milestone_popups_enabled, last_milestone_popup_at, last_xp_recalculated_at, preferred_language
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
  SELECT user_id, name, avatar_url, headline, bio, role, xp, xp_level, xp_recent_12m,
    contribution_index, has_completed_onboarding, created_at, updated_at,
    current_plan_code, total_shares_a, total_shares_b, governance_weight,
    is_cooperative_member, filter_by_houses, allow_wall_comments, persona_type, location
  FROM public.profiles;
