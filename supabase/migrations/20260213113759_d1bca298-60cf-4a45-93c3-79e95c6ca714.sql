
-- Drop the recursive policies
DROP POLICY IF EXISTS "Users see participants of own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users see own conversations" ON public.conversations;

-- Fix: conversation_participants SELECT - use direct user_id check
CREATE POLICY "Users see participants of own conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    conversation_id IN (
      SELECT cp.conversation_id FROM public.conversation_participants cp WHERE cp.user_id = auth.uid()
    )
  );

-- Fix: conversations SELECT - avoid subquery through conversation_participants (which triggers its own RLS)
-- Use a security definer function instead
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid();
$$;

CREATE POLICY "Users see own conversations"
  ON public.conversations FOR SELECT
  USING (id IN (SELECT public.get_my_conversation_ids()));

-- Also fix the UPDATE policy on conversations which has same issue
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (id IN (SELECT public.get_my_conversation_ids()));

-- Fix messages SELECT policy - same issue
DROP POLICY IF EXISTS "Users see messages in own conversations" ON public.direct_messages;
CREATE POLICY "Users see messages in own conversations"
  ON public.direct_messages FOR SELECT
  USING (conversation_id IN (SELECT public.get_my_conversation_ids()));

-- Fix messages INSERT policy
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON public.direct_messages;
CREATE POLICY "Users can send messages to own conversations"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (SELECT public.get_my_conversation_ids())
  );
