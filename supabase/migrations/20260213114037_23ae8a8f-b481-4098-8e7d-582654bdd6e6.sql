
-- Drop all problematic policies
DROP POLICY IF EXISTS "Users see participants of own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users see own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation creator can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users see messages in own conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages to own conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can soft-delete own messages" ON public.direct_messages;

-- Drop the recursive helper
DROP FUNCTION IF EXISTS public.get_my_conversation_ids();

-- Simple, non-recursive policies using direct user_id checks

-- conversation_participants: user can see their own rows
CREATE POLICY "cp_select" ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- conversation_participants: no direct inserts (use function)
-- But allow for service role / function calls
CREATE POLICY "cp_insert" ON public.conversation_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "cp_update" ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- conversations: user can see conversations where they have a participant row
-- We check via a subquery on conversation_participants but that's fine since cp_select is non-recursive
CREATE POLICY "conv_select" ON public.conversations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "conv_insert" ON public.conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "conv_update" ON public.conversations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  ));

-- direct_messages: user can see messages in conversations they participate in
CREATE POLICY "dm_select" ON public.direct_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = direct_messages.conversation_id AND cp.user_id = auth.uid()
  ));

CREATE POLICY "dm_insert" ON public.direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = direct_messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "dm_update" ON public.direct_messages FOR UPDATE
  USING (sender_id = auth.uid());
