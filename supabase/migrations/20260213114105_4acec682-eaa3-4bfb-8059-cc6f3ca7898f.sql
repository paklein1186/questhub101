
-- Function to get all participants for conversations the current user belongs to
CREATE OR REPLACE FUNCTION public.get_conversation_participants(conv_ids UUID[])
RETURNS TABLE(id UUID, conversation_id UUID, user_id UUID, joined_at TIMESTAMPTZ, last_read_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT cp.id, cp.conversation_id, cp.user_id, cp.joined_at, cp.last_read_at
  FROM public.conversation_participants cp
  WHERE cp.conversation_id = ANY(conv_ids)
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp2
      WHERE cp2.conversation_id = cp.conversation_id AND cp2.user_id = auth.uid()
    );
$$;
