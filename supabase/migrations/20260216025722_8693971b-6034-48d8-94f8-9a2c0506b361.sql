
-- Log when a quest is soft-deleted
CREATE OR REPLACE FUNCTION public.log_quest_deleted()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
    INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
    VALUES (COALESCE(auth.uid(), NEW.created_by_user_id), 'quest_deleted', 'quest', NEW.id, NEW.title);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_log_quest_deleted
  AFTER UPDATE ON public.quests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_quest_deleted();

-- Log when a subtask is deleted (hard delete)
CREATE OR REPLACE FUNCTION public.log_subtask_deleted()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name, metadata)
  VALUES (
    COALESCE(auth.uid(), OLD.assignee_user_id),
    'subtask_deleted',
    'subtask',
    OLD.id,
    OLD.title,
    jsonb_build_object('quest_id', OLD.quest_id)
  );
  RETURN OLD;
END;
$function$;

CREATE TRIGGER trg_log_subtask_deleted
  BEFORE DELETE ON public.quest_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subtask_deleted();

-- Also log subtask status changes to "done" (completed)
CREATE OR REPLACE FUNCTION public.log_subtask_completed()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name, metadata)
    VALUES (
      COALESCE(auth.uid(), NEW.assignee_user_id),
      'subtask_completed',
      'subtask',
      NEW.id,
      NEW.title,
      jsonb_build_object('quest_id', NEW.quest_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_log_subtask_completed
  AFTER UPDATE ON public.quest_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subtask_completed();
