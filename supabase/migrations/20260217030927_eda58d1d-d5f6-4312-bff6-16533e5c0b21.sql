
-- Fix: Restrict profiles SELECT to own profile only (+ admins)
-- This prevents any authenticated user from reading ALL profiles' sensitive data
-- The profiles_public SECURITY DEFINER view will still serve public data for all users

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

-- Users can only read their OWN full profile (includes credits_balance, email, etc.)
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all profiles for administration
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
