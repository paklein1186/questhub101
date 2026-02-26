
-- Fix overly permissive RLS on territory_dataset_matches
DROP POLICY IF EXISTS "Authenticated users can manage territory dataset matches" ON public.territory_dataset_matches;

CREATE POLICY "Authenticated users can insert territory dataset matches"
  ON public.territory_dataset_matches
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update territory dataset matches"
  ON public.territory_dataset_matches
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);
