
-- Drop the still-recursive policy
DROP POLICY IF EXISTS "Users see participants of own conversations" ON public.conversation_participants;

-- Create a simple non-recursive policy: user can see rows where they are a participant
-- This avoids the self-referencing subquery by just checking user_id directly
-- OR where they belong to the same conversation (via security definer function)
CREATE POLICY "Users see participants of own conversations"
  ON public.conversation_participants FOR SELECT
  USING (conversation_id IN (SELECT public.get_my_conversation_ids()));

-- Fix the INSERT policy for conversation_participants to also allow the creator to add participants
DROP POLICY IF EXISTS "Conversation creator can add participants" ON public.conversation_participants;
CREATE POLICY "Conversation creator can add participants"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_id AND created_by = auth.uid()
    )
    OR user_id = auth.uid()
  );
