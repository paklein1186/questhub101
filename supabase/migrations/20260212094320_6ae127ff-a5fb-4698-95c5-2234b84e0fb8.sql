
-- Fix quest_participants INSERT policy to allow quest owners/collaborators to add members
DROP POLICY IF EXISTS "Users can join quests" ON public.quest_participants;
CREATE POLICY "Users can join quests or owners can invite"
  ON public.quest_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.quests q
      WHERE q.id = quest_participants.quest_id
        AND q.owner_id = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1 FROM public.quest_participants qp
      WHERE qp.quest_id = quest_participants.quest_id
        AND qp.user_id = auth.uid()
        AND qp.role = 'COLLABORATOR'
    )
  );

-- Fix company_members INSERT policy to allow company admins to add members
DROP POLICY IF EXISTS "Users can join companies" ON public.company_members;
CREATE POLICY "Users can join companies or admins can invite"
  ON public.company_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_members.company_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'ADMIN'
    )
  );
