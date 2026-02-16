-- Fix: Restrict conversation_participants INSERT to conversation creators or existing participants
DROP POLICY IF EXISTS "cp_insert" ON public.conversation_participants;

-- Allow inserts only if:
-- 1. The user is the conversation creator (can add participants when creating a conversation)
-- 2. The user is already a participant (can invite others to group chats)
-- 3. The user is adding themselves AND they are the conversation creator
CREATE POLICY "cp_insert_restricted" 
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    -- Conversation creator can add participants
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id 
      AND c.created_by = auth.uid()
    )
    OR
    -- Existing participants can invite others (for group chats)
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );