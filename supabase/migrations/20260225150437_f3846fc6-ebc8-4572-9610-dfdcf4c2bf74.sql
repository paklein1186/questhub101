
-- Fix: pod_member_role enum only has HOST and MEMBER, not ADMIN.
-- The notify_new_member_joined_pod trigger references 'ADMIN' which is invalid.

CREATE OR REPLACE FUNCTION public.notify_new_member_joined_pod()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _admin RECORD;
  _member_name TEXT;
  _pod_name TEXT;
BEGIN
  -- Skip notification for hosts (ADMIN doesn't exist in pod_member_role enum)
  IF NEW.role = 'HOST' THEN RETURN NEW; END IF;

  SELECT name INTO _member_name FROM profiles WHERE user_id = NEW.user_id;
  SELECT name INTO _pod_name FROM pods WHERE id = NEW.pod_id;

  FOR _admin IN
    SELECT user_id FROM pod_members
    WHERE pod_id = NEW.pod_id AND role = 'HOST' AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _admin.user_id,
      'GUILD_MEMBER_ADDED',
      'New member joined',
      COALESCE(_member_name, 'Someone') || ' joined "' || COALESCE(_pod_name, 'your pod') || '"',
      'POD',
      NEW.pod_id::text,
      '/pods/' || NEW.pod_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;
