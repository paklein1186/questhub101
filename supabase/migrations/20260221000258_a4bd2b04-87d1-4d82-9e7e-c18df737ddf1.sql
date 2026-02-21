
-- Add column to track the sender's conversation for each broadcast
ALTER TABLE public.broadcast_messages ADD COLUMN IF NOT EXISTS sender_conversation_id UUID REFERENCES public.conversations(id);

-- Create trigger function: when a recipient replies in their broadcast conversation,
-- forward the reply into the sender's conversation with the respondent's profile info.
CREATE OR REPLACE FUNCTION public.forward_broadcast_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _broadcast RECORD;
  _sender_conv_id UUID;
  _broadcast_sender_id UUID;
  _respondent_name TEXT;
  _forwarded_content TEXT;
BEGIN
  -- Check if this conversation belongs to a broadcast recipient
  SELECT br.broadcast_id, bm.sender_conversation_id, bm.sender_user_id, bm.sender_label
  INTO _broadcast
  FROM broadcast_recipients br
  JOIN broadcast_messages bm ON bm.id = br.broadcast_id
  WHERE br.conversation_id = NEW.conversation_id
  LIMIT 1;

  -- Not a broadcast conversation, skip
  IF _broadcast IS NULL THEN
    RETURN NEW;
  END IF;

  _sender_conv_id := _broadcast.sender_conversation_id;
  _broadcast_sender_id := _broadcast.sender_user_id;

  -- Skip if the message is from the broadcast sender (avoid loops)
  IF NEW.sender_id = _broadcast_sender_id THEN
    RETURN NEW;
  END IF;

  -- Skip if no sender conversation tracked
  IF _sender_conv_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get respondent name
  SELECT COALESCE(p.name, 'Unknown user') INTO _respondent_name
  FROM profiles p WHERE p.user_id = NEW.sender_id;

  -- Build forwarded content with respondent attribution
  _forwarded_content := '💬 **' || _respondent_name || '** replied:' || E'\n' || NEW.content;

  -- Insert forwarded message into the sender's conversation
  INSERT INTO direct_messages (conversation_id, sender_id, content, sender_label)
  VALUES (_sender_conv_id, NEW.sender_id, _forwarded_content, _respondent_name);

  -- Bump the sender conversation timestamp
  UPDATE conversations SET updated_at = now() WHERE id = _sender_conv_id;

  RETURN NEW;
END;
$$;

-- Attach trigger to direct_messages
DROP TRIGGER IF EXISTS trg_forward_broadcast_reply ON public.direct_messages;
CREATE TRIGGER trg_forward_broadcast_reply
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.forward_broadcast_reply();
