CREATE OR REPLACE FUNCTION public.find_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.conversations c
  JOIN public.conversation_participants me ON me.conversation_id = c.id AND me.user_id = auth.uid()
  JOIN public.conversation_participants other ON other.conversation_id = c.id AND other.user_id = other_user_id
  WHERE c.is_group = false
    AND auth.uid() IS NOT NULL
    AND (SELECT count(*) FROM public.conversation_participants p WHERE p.conversation_id = c.id) = 2
  ORDER BY c.updated_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.find_direct_conversation(uuid) TO authenticated;