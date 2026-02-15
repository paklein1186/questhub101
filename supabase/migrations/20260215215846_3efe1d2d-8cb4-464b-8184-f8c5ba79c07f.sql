
-- Fix: allow quest creators to still see their own deleted quests (needed for soft-delete to work)
DROP POLICY IF EXISTS "Published quests are viewable by everyone" ON public.quests;

CREATE POLICY "Published quests are viewable by everyone"
ON public.quests
FOR SELECT
USING (
  (is_deleted = false AND (is_draft = false OR created_by_user_id = auth.uid()))
  OR created_by_user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);
