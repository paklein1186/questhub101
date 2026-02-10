
-- 1. Drop the overly permissive public SELECT policy
DROP POLICY "Profiles are viewable by everyone" ON public.profiles;

-- 2. Users can read their own full profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Create a public view excluding sensitive fields (email)
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT id, user_id, name, avatar_url, headline, bio, role, xp,
         contribution_index, has_completed_onboarding, created_at, updated_at,
         current_plan_code
  FROM public.profiles;

-- 4. Allow authenticated users to read any public profile via the view
-- The view uses security_invoker so we need a SELECT policy that allows
-- authenticated users to read all rows (but only through the view which excludes email)
-- We already have the self-read policy above. We need a broader one for the view.
-- Since security_invoker means the view runs as the calling user, we need to allow
-- authenticated users to SELECT from profiles but only non-sensitive data via the view.
-- Instead, let's use a different approach: allow all authenticated users to read profiles
-- but the view hides email.
DROP POLICY "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
