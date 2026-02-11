-- Recreate profiles_public view WITHOUT security_invoker so all users can query public profile data
-- The view excludes sensitive fields (email) providing column-level security
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
  SELECT user_id, name, avatar_url, headline, bio, role, xp,
         contribution_index, has_completed_onboarding, created_at, updated_at,
         current_plan_code, total_shares_a, total_shares_b, governance_weight,
         is_cooperative_member, filter_by_houses
  FROM public.profiles;