-- Allow authenticated users to search/read other profiles (needed for user search, messaging, etc.)
CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Drop the now-redundant self-read policy (the new one covers it)
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
-- Drop the admin-only read policy (the new one covers it)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;