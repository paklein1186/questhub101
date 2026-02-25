
-- Tighten DELETE policy: only allow deleting links you created (via manual) or where you're the linked user
DROP POLICY IF EXISTS "Authenticated users can delete own links" ON public.natural_system_links;
CREATE POLICY "Users can delete manual links they're involved in"
  ON public.natural_system_links FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND linked_via = 'manual'
  );

-- Tighten INSERT policy: require auth and only manual links
DROP POLICY IF EXISTS "Authenticated users can insert natural_system_links" ON public.natural_system_links;
CREATE POLICY "Authenticated users can insert manual links"
  ON public.natural_system_links FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND linked_via = 'manual'
  );
