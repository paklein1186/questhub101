-- Fix broken RLS policies on conversations table
-- The existing policies reference cp.id instead of conversations.id

DROP POLICY IF EXISTS "conv_select" ON public.conversations;
DROP POLICY IF EXISTS "conv_update" ON public.conversations;

CREATE POLICY "conv_select" ON public.conversations
FOR SELECT USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "conv_update" ON public.conversations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
  )
);