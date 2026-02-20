
-- ============================================================
-- 1. Notify entity admins when a JOIN APPLICATION is submitted
-- ============================================================

-- Guild applications → notify guild admins
CREATE OR REPLACE FUNCTION public.notify_guild_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin RECORD;
  _applicant_name TEXT;
  _guild_name TEXT;
BEGIN
  -- Only fire on new pending applications
  IF NEW.status != 'PENDING' THEN RETURN NEW; END IF;

  SELECT name INTO _applicant_name FROM profiles WHERE user_id = NEW.applicant_user_id;
  SELECT name INTO _guild_name FROM guilds WHERE id = NEW.guild_id;

  FOR _admin IN
    SELECT user_id FROM guild_members
    WHERE guild_id = NEW.guild_id AND role = 'ADMIN' AND user_id != NEW.applicant_user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _admin.user_id,
      'ENTITY_JOIN_REQUEST',
      'New membership request',
      COALESCE(_applicant_name, 'Someone') || ' wants to join "' || COALESCE(_guild_name, 'your guild') || '"',
      'GUILD',
      NEW.guild_id::text,
      '/guilds/' || NEW.guild_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_guild_application
AFTER INSERT ON public.guild_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_guild_application_submitted();

-- Company applications → notify company admins
CREATE OR REPLACE FUNCTION public.notify_company_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin RECORD;
  _applicant_name TEXT;
  _company_name TEXT;
BEGIN
  IF NEW.status != 'PENDING' THEN RETURN NEW; END IF;

  SELECT name INTO _applicant_name FROM profiles WHERE user_id = NEW.applicant_user_id;
  SELECT name INTO _company_name FROM companies WHERE id = NEW.company_id;

  FOR _admin IN
    SELECT user_id FROM company_members
    WHERE company_id = NEW.company_id AND role = 'ADMIN' AND user_id != NEW.applicant_user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _admin.user_id,
      'ENTITY_JOIN_REQUEST',
      'New membership request',
      COALESCE(_applicant_name, 'Someone') || ' wants to join "' || COALESCE(_company_name, 'your organization') || '"',
      'COMPANY',
      NEW.company_id::text,
      '/companies/' || NEW.company_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_company_application
AFTER INSERT ON public.company_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_company_application_submitted();

-- Pod applications → notify pod admins
CREATE OR REPLACE FUNCTION public.notify_pod_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin RECORD;
  _applicant_name TEXT;
  _pod_name TEXT;
BEGIN
  IF NEW.status != 'PENDING' THEN RETURN NEW; END IF;

  SELECT name INTO _applicant_name FROM profiles WHERE user_id = NEW.applicant_user_id;
  SELECT name INTO _pod_name FROM pods WHERE id = NEW.pod_id;

  FOR _admin IN
    SELECT user_id FROM pod_members
    WHERE pod_id = NEW.pod_id AND role = 'ADMIN' AND user_id != NEW.applicant_user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _admin.user_id,
      'ENTITY_JOIN_REQUEST',
      'New membership request',
      COALESCE(_applicant_name, 'Someone') || ' wants to join "' || COALESCE(_pod_name, 'your pod') || '"',
      'POD',
      NEW.pod_id::text,
      '/pods/' || NEW.pod_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_pod_application
AFTER INSERT ON public.pod_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_pod_application_submitted();


-- ============================================================
-- 2. Notify target entity admins when a PARTNERSHIP is proposed
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_partnership_proposed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin RECORD;
  _from_name TEXT;
  _to_name TEXT;
  _deep_link TEXT;
BEGIN
  IF NEW.status != 'PENDING' THEN RETURN NEW; END IF;

  -- Resolve from-entity name
  IF NEW.from_entity_type = 'GUILD' THEN
    SELECT name INTO _from_name FROM guilds WHERE id = NEW.from_entity_id;
  ELSIF NEW.from_entity_type = 'COMPANY' THEN
    SELECT name INTO _from_name FROM companies WHERE id = NEW.from_entity_id;
  END IF;

  -- Resolve to-entity name and admins
  IF NEW.to_entity_type = 'GUILD' THEN
    SELECT name INTO _to_name FROM guilds WHERE id = NEW.to_entity_id;
    _deep_link := '/guilds/' || NEW.to_entity_id;

    FOR _admin IN
      SELECT user_id FROM guild_members
      WHERE guild_id = NEW.to_entity_id AND role = 'ADMIN'
    LOOP
      INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
      VALUES (
        _admin.user_id,
        'PARTNERSHIP_PROPOSED',
        'New partnership proposal',
        '"' || COALESCE(_from_name, 'An entity') || '" wants to partner with "' || COALESCE(_to_name, 'your guild') || '"',
        NEW.to_entity_type,
        NEW.to_entity_id::text,
        _deep_link
      );
    END LOOP;

  ELSIF NEW.to_entity_type = 'COMPANY' THEN
    SELECT name INTO _to_name FROM companies WHERE id = NEW.to_entity_id;
    _deep_link := '/companies/' || NEW.to_entity_id;

    FOR _admin IN
      SELECT user_id FROM company_members
      WHERE company_id = NEW.to_entity_id AND role = 'ADMIN'
    LOOP
      INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
      VALUES (
        _admin.user_id,
        'PARTNERSHIP_PROPOSED',
        'New partnership proposal',
        '"' || COALESCE(_from_name, 'An entity') || '" wants to partner with "' || COALESCE(_to_name, 'your organization') || '"',
        NEW.to_entity_type,
        NEW.to_entity_id::text,
        _deep_link
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_partnership_proposed
AFTER INSERT ON public.partnerships
FOR EACH ROW EXECUTE FUNCTION public.notify_partnership_proposed();
