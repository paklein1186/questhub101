
-- ============================================================
-- XP triggers for unit joins, event registration, course enrollment,
-- event creation, and notifications for all new actions
-- ============================================================

-- 1. XP on guild join
CREATE OR REPLACE FUNCTION public.xp_on_guild_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.grant_user_xp(NEW.user_id, 'GUILD_JOINED', 2, NULL, NULL, 'guild', NEW.guild_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_guild_join ON guild_members;
CREATE TRIGGER trg_xp_guild_join
  AFTER INSERT ON guild_members
  FOR EACH ROW EXECUTE FUNCTION xp_on_guild_join();

-- 2. XP on company join
CREATE OR REPLACE FUNCTION public.xp_on_company_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.grant_user_xp(NEW.user_id, 'COMPANY_JOINED', 2, NULL, NULL, 'company', NEW.company_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_company_join ON company_members;
CREATE TRIGGER trg_xp_company_join
  AFTER INSERT ON company_members
  FOR EACH ROW EXECUTE FUNCTION xp_on_company_join();

-- 3. XP on pod join
CREATE OR REPLACE FUNCTION public.xp_on_pod_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.grant_user_xp(NEW.user_id, 'POD_JOINED', 2, NULL, NULL, 'pod', NEW.pod_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_pod_join ON pod_members;
CREATE TRIGGER trg_xp_pod_join
  AFTER INSERT ON pod_members
  FOR EACH ROW EXECUTE FUNCTION xp_on_pod_join();

-- 4. XP on event registration
CREATE OR REPLACE FUNCTION public.xp_on_event_registered()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.grant_user_xp(NEW.user_id, 'EVENT_REGISTERED', 1, NULL, NULL, 'event', NEW.event_id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_event_registered ON guild_event_attendees;
CREATE TRIGGER trg_xp_event_registered
  AFTER INSERT ON guild_event_attendees
  FOR EACH ROW EXECUTE FUNCTION xp_on_event_registered();

-- 5. XP on course enrollment
CREATE OR REPLACE FUNCTION public.xp_on_course_enrolled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.grant_user_xp(NEW.user_id, 'COURSE_ENROLLED', 2, NULL, NULL, 'course', NEW.course_id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_course_enrolled ON course_enrollments;
CREATE TRIGGER trg_xp_course_enrolled
  AFTER INSERT ON course_enrollments
  FOR EACH ROW EXECUTE FUNCTION xp_on_course_enrolled();

-- 6. XP on post creation
CREATE OR REPLACE FUNCTION public.xp_on_post_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Only award for non-reshared original posts
  IF NEW.reshared_post_id IS NULL THEN
    PERFORM public.grant_user_xp(NEW.author_user_id, 'POST_CREATED', 2, NULL, NULL, 'post', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_post_created ON feed_posts;
CREATE TRIGGER trg_xp_post_created
  AFTER INSERT ON feed_posts
  FOR EACH ROW EXECUTE FUNCTION xp_on_post_created();

-- 7. XP on event creation
CREATE OR REPLACE FUNCTION public.xp_on_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.grant_user_xp(NEW.created_by_user_id, 'EVENT_CREATED', 5, NULL, NULL, 'event', NEW.id::text);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_event_created ON guild_events;
CREATE TRIGGER trg_xp_event_created
  AFTER INSERT ON guild_events
  FOR EACH ROW EXECUTE FUNCTION xp_on_event_created();

-- 8. XP on service creation
CREATE OR REPLACE FUNCTION public.xp_on_service_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.provider_user_id IS NOT NULL THEN
    PERFORM public.grant_user_xp(NEW.provider_user_id, 'SERVICE_CREATED', 5, NULL, NULL, 'service', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_xp_service_created ON services;
CREATE TRIGGER trg_xp_service_created
  AFTER INSERT ON services
  FOR EACH ROW EXECUTE FUNCTION xp_on_service_created();

-- ============================================================
-- Notification triggers for new member joins (admins notified)
-- ============================================================

-- Notify guild admins when a new member joins directly (not via application)
CREATE OR REPLACE FUNCTION public.notify_new_member_joined_guild()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _admin RECORD;
  _member_name TEXT;
  _guild_name TEXT;
BEGIN
  -- Skip if this is an admin (creator)
  IF NEW.role = 'ADMIN' THEN RETURN NEW; END IF;

  SELECT name INTO _member_name FROM profiles WHERE user_id = NEW.user_id;
  SELECT name INTO _guild_name FROM guilds WHERE id = NEW.guild_id;

  FOR _admin IN
    SELECT user_id FROM guild_members
    WHERE guild_id = NEW.guild_id AND role = 'ADMIN' AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _admin.user_id,
      'GUILD_MEMBER_ADDED',
      'New member joined',
      COALESCE(_member_name, 'Someone') || ' joined "' || COALESCE(_guild_name, 'your guild') || '"',
      'GUILD',
      NEW.guild_id::text,
      '/guilds/' || NEW.guild_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_guild_member_joined ON guild_members;
CREATE TRIGGER trg_notify_guild_member_joined
  AFTER INSERT ON guild_members
  FOR EACH ROW EXECUTE FUNCTION notify_new_member_joined_guild();

-- Notify company admins when a new member joins
CREATE OR REPLACE FUNCTION public.notify_new_member_joined_company()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _admin RECORD;
  _member_name TEXT;
  _company_name TEXT;
BEGIN
  IF NEW.role = 'ADMIN' THEN RETURN NEW; END IF;

  SELECT name INTO _member_name FROM profiles WHERE user_id = NEW.user_id;
  SELECT name INTO _company_name FROM companies WHERE id = NEW.company_id;

  FOR _admin IN
    SELECT user_id FROM company_members
    WHERE company_id = NEW.company_id AND role = 'ADMIN' AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _admin.user_id,
      'GUILD_MEMBER_ADDED',
      'New member joined',
      COALESCE(_member_name, 'Someone') || ' joined "' || COALESCE(_company_name, 'your organization') || '"',
      'COMPANY',
      NEW.company_id::text,
      '/companies/' || NEW.company_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_company_member_joined ON company_members;
CREATE TRIGGER trg_notify_company_member_joined
  AFTER INSERT ON company_members
  FOR EACH ROW EXECUTE FUNCTION notify_new_member_joined_company();

-- Notify pod admins when a new member joins
CREATE OR REPLACE FUNCTION public.notify_new_member_joined_pod()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _admin RECORD;
  _member_name TEXT;
  _pod_name TEXT;
BEGIN
  IF NEW.role IN ('ADMIN', 'HOST') THEN RETURN NEW; END IF;

  SELECT name INTO _member_name FROM profiles WHERE user_id = NEW.user_id;
  SELECT name INTO _pod_name FROM pods WHERE id = NEW.pod_id;

  FOR _admin IN
    SELECT user_id FROM pod_members
    WHERE pod_id = NEW.pod_id AND role IN ('ADMIN', 'HOST') AND user_id != NEW.user_id
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

DROP TRIGGER IF EXISTS trg_notify_pod_member_joined ON pod_members;
CREATE TRIGGER trg_notify_pod_member_joined
  AFTER INSERT ON pod_members
  FOR EACH ROW EXECUTE FUNCTION notify_new_member_joined_pod();

-- Notify guild members when a new event is created
CREATE OR REPLACE FUNCTION public.notify_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _member RECORD;
  _guild_name TEXT;
BEGIN
  SELECT name INTO _guild_name FROM guilds WHERE id = NEW.guild_id;

  FOR _member IN
    SELECT user_id FROM guild_members
    WHERE guild_id = NEW.guild_id AND user_id != NEW.created_by_user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _member.user_id,
      'FOLLOWED_ENTITY_NEW_EVENT',
      'New event in ' || COALESCE(_guild_name, 'your guild'),
      '"' || NEW.title || '" has been created',
      'EVENT',
      NEW.id::text,
      '/guilds/' || NEW.guild_id || '/events'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_event_created ON guild_events;
CREATE TRIGGER trg_notify_event_created
  AFTER INSERT ON guild_events
  FOR EACH ROW EXECUTE FUNCTION notify_event_created();

-- Notify guild members when a new service is created under the guild
CREATE OR REPLACE FUNCTION public.notify_service_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _member RECORD;
  _guild_name TEXT;
BEGIN
  -- Only for guild services
  IF NEW.provider_guild_id IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO _guild_name FROM guilds WHERE id = NEW.provider_guild_id;

  FOR _member IN
    SELECT user_id FROM guild_members
    WHERE guild_id = NEW.provider_guild_id AND user_id != COALESCE(NEW.provider_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
    VALUES (
      _member.user_id,
      'FOLLOWED_ENTITY_NEW_SERVICE',
      'New service in ' || COALESCE(_guild_name, 'your guild'),
      '"' || NEW.title || '" is now available',
      'SERVICE',
      NEW.id::text,
      '/services/' || NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_service_created ON services;
CREATE TRIGGER trg_notify_service_created
  AFTER INSERT ON services
  FOR EACH ROW EXECUTE FUNCTION notify_service_created();

-- Add GUILD_MEMBER_ADDED, FOLLOWED_ENTITY_NEW_SERVICE to email-worthy notifications
-- (Already handled in edge function update)

-- Also add valid XP types to grant_user_xp function
-- The function uses a generic INSERT so any type string works
