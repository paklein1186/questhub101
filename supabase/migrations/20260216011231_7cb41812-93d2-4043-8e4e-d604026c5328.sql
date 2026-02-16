
-- Remove redundant policy (the public SELECT policy already covers own items)
DROP POLICY IF EXISTS "Users can view own masked items" ON public.profile_masked_items;
