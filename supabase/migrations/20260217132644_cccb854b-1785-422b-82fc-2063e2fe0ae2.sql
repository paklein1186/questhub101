-- Allow unauthenticated (anon) users to read profiles via the profiles_public view
CREATE POLICY "Anon can read profiles via public view"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);
