
-- Add status column to quest_affiliations for approval flow
ALTER TABLE public.quest_affiliations 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID;

-- Update existing affiliations to APPROVED (they were added before the approval flow)
UPDATE public.quest_affiliations SET status = 'APPROVED' WHERE status = 'PENDING';

-- Notify entity admins when a new affiliation request is created
CREATE OR REPLACE FUNCTION public.notify_quest_affiliation_requested()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin RECORD;
  _quest_title TEXT;
  _entity_name TEXT;
  _deep_link TEXT;
BEGIN
  IF NEW.status != 'PENDING' THEN RETURN NEW; END IF;

  SELECT title INTO _quest_title FROM quests WHERE id = NEW.quest_id;

  IF NEW.entity_type = 'GUILD' THEN
    SELECT name INTO _entity_name FROM guilds WHERE id = NEW.entity_id;
    _deep_link := '/guilds/' || NEW.entity_id || '?tab=quests';

    FOR _admin IN
      SELECT user_id FROM guild_members
      WHERE guild_id = NEW.entity_id AND role = 'ADMIN' AND user_id != NEW.created_by_user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
      VALUES (
        _admin.user_id,
        'QUEST_AFFILIATION_REQUEST',
        'Quest affiliation request',
        'The quest "' || COALESCE(_quest_title, 'Untitled') || '" wants to affiliate with "' || COALESCE(_entity_name, 'your guild') || '"',
        'GUILD',
        NEW.entity_id::text,
        _deep_link
      );
    END LOOP;

  ELSIF NEW.entity_type = 'COMPANY' THEN
    SELECT name INTO _entity_name FROM companies WHERE id = NEW.entity_id;
    _deep_link := '/companies/' || NEW.entity_id || '?tab=quests';

    FOR _admin IN
      SELECT user_id FROM company_members
      WHERE company_id = NEW.entity_id AND role IN ('admin', 'owner', 'ADMIN') AND user_id != NEW.created_by_user_id
    LOOP
      INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
      VALUES (
        _admin.user_id,
        'QUEST_AFFILIATION_REQUEST',
        'Quest affiliation request',
        'The quest "' || COALESCE(_quest_title, 'Untitled') || '" wants to affiliate with "' || COALESCE(_entity_name, 'your organization') || '"',
        'COMPANY',
        NEW.entity_id::text,
        _deep_link
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quest_affiliation ON public.quest_affiliations;
CREATE TRIGGER trg_notify_quest_affiliation
  AFTER INSERT ON public.quest_affiliations
  FOR EACH ROW EXECUTE FUNCTION public.notify_quest_affiliation_requested();

-- Function to approve an affiliation (also creates quest_hosts entry)
CREATE OR REPLACE FUNCTION public.approve_quest_affiliation(_affiliation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _aff RECORD;
  _actor_id UUID := auth.uid();
  _is_admin BOOLEAN := false;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _aff FROM quest_affiliations WHERE id = _affiliation_id;
  IF _aff IS NULL THEN
    RAISE EXCEPTION 'Affiliation not found';
  END IF;

  IF _aff.status != 'PENDING' THEN
    RAISE EXCEPTION 'Affiliation is not pending';
  END IF;

  -- Check if actor is admin of the target entity
  IF _aff.entity_type = 'GUILD' THEN
    SELECT EXISTS (
      SELECT 1 FROM guild_members WHERE guild_id = _aff.entity_id AND user_id = _actor_id AND role = 'ADMIN'
    ) INTO _is_admin;
  ELSIF _aff.entity_type = 'COMPANY' THEN
    SELECT EXISTS (
      SELECT 1 FROM company_members WHERE company_id = _aff.entity_id AND user_id = _actor_id AND role IN ('admin', 'owner', 'ADMIN')
    ) INTO _is_admin;
  END IF;

  -- Also allow platform admins
  IF NOT _is_admin THEN
    _is_admin := public.has_role(_actor_id, 'admin');
  END IF;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Not authorized to approve this affiliation';
  END IF;

  -- Approve
  UPDATE quest_affiliations 
  SET status = 'APPROVED', reviewed_at = now(), reviewed_by_user_id = _actor_id
  WHERE id = _affiliation_id;

  -- Auto-create quest_hosts entry as CO_HOST (if not already there)
  INSERT INTO quest_hosts (quest_id, entity_type, entity_id, role, created_by_user_id)
  VALUES (_aff.quest_id, _aff.entity_type, _aff.entity_id, 'CO_HOST', _actor_id)
  ON CONFLICT (quest_id, entity_type, entity_id) DO NOTHING;

  -- Notify quest creator
  INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
  SELECT _aff.created_by_user_id, 'QUEST_AFFILIATION_APPROVED', 'Affiliation approved',
    'Your quest has been accepted by ' || COALESCE(
      CASE WHEN _aff.entity_type = 'GUILD' THEN (SELECT name FROM guilds WHERE id = _aff.entity_id)
           ELSE (SELECT name FROM companies WHERE id = _aff.entity_id) END,
      'an entity'
    ),
    _aff.entity_type, _aff.entity_id::text,
    '/quests/' || _aff.quest_id;
END;
$$;

-- Function to reject an affiliation
CREATE OR REPLACE FUNCTION public.reject_quest_affiliation(_affiliation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _aff RECORD;
  _actor_id UUID := auth.uid();
  _is_admin BOOLEAN := false;
BEGIN
  IF _actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _aff FROM quest_affiliations WHERE id = _affiliation_id;
  IF _aff IS NULL THEN
    RAISE EXCEPTION 'Affiliation not found';
  END IF;

  IF _aff.status != 'PENDING' THEN
    RAISE EXCEPTION 'Affiliation is not pending';
  END IF;

  IF _aff.entity_type = 'GUILD' THEN
    SELECT EXISTS (
      SELECT 1 FROM guild_members WHERE guild_id = _aff.entity_id AND user_id = _actor_id AND role = 'ADMIN'
    ) INTO _is_admin;
  ELSIF _aff.entity_type = 'COMPANY' THEN
    SELECT EXISTS (
      SELECT 1 FROM company_members WHERE company_id = _aff.entity_id AND user_id = _actor_id AND role IN ('admin', 'owner', 'ADMIN')
    ) INTO _is_admin;
  END IF;

  IF NOT _is_admin THEN
    _is_admin := public.has_role(_actor_id, 'admin');
  END IF;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Not authorized to reject this affiliation';
  END IF;

  UPDATE quest_affiliations 
  SET status = 'REJECTED', reviewed_at = now(), reviewed_by_user_id = _actor_id
  WHERE id = _affiliation_id;

  -- Notify quest creator
  INSERT INTO notifications (user_id, type, title, body, related_entity_type, related_entity_id, deep_link_url)
  SELECT _aff.created_by_user_id, 'QUEST_AFFILIATION_REJECTED', 'Affiliation declined',
    'Your affiliation request was declined by ' || COALESCE(
      CASE WHEN _aff.entity_type = 'GUILD' THEN (SELECT name FROM guilds WHERE id = _aff.entity_id)
           ELSE (SELECT name FROM companies WHERE id = _aff.entity_id) END,
      'an entity'
    ),
    _aff.entity_type, _aff.entity_id::text,
    '/quests/' || _aff.quest_id;
END;
$$;

-- Update the quests-for-guild query: only show APPROVED affiliations
-- (This is handled in frontend code, but let's also update the RLS to be safe)

-- Update the entity quests display: only count APPROVED affiliations
-- Done in frontend
