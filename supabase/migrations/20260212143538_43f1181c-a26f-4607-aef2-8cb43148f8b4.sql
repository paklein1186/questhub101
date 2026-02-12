-- Recreate the profiles_public view to include allow_wall_comments
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  user_id,
  name,
  avatar_url,
  headline,
  bio,
  role,
  xp,
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
  allow_wall_comments
FROM profiles;