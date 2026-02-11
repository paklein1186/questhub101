
-- Drop the restrictive INSERT policy on territory_memory
DROP POLICY "Territory members can add memory" ON public.territory_memory;

-- Create a more permissive policy: any authenticated user can contribute
CREATE POLICY "Authenticated users can add memory"
  ON public.territory_memory
  FOR INSERT
  WITH CHECK (auth.uid() = created_by_user_id);
