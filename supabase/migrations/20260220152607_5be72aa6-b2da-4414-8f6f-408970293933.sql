-- Fix quest_participants INSERT policy to use created_by_user_id instead of owner_id
DROP POLICY IF EXISTS "Users can join quests or owners can invite" ON public.quest_participants;

CREATE POLICY "Users can join quests or owners can invite"
ON public.quest_participants
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id)
  OR (EXISTS (
    SELECT 1 FROM quests q
    WHERE q.id = quest_participants.quest_id
      AND q.created_by_user_id = auth.uid()
  ))
  OR (EXISTS (
    SELECT 1 FROM quest_participants qp
    WHERE qp.quest_id = quest_participants.quest_id
      AND qp.user_id = auth.uid()
      AND qp.role = 'COLLABORATOR'
  ))
);