
CREATE OR REPLACE FUNCTION public.log_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t_name TEXT;
BEGIN
  IF NEW.target_type = 'USER' THEN
    SELECT name INTO t_name FROM public.profiles WHERE user_id = NEW.target_id::uuid;
  ELSIF NEW.target_type = 'GUILD' THEN
    SELECT name INTO t_name FROM public.guilds WHERE id = NEW.target_id::uuid;
  ELSIF NEW.target_type = 'COMPANY' THEN
    SELECT name INTO t_name FROM public.companies WHERE id = NEW.target_id::uuid;
  ELSIF NEW.target_type = 'QUEST' THEN
    SELECT title INTO t_name FROM public.quests WHERE id = NEW.target_id::uuid;
  ELSIF NEW.target_type = 'SERVICE' THEN
    SELECT title INTO t_name FROM public.services WHERE id = NEW.target_id::uuid;
  ELSIF NEW.target_type = 'COURSE' THEN
    SELECT title INTO t_name FROM public.courses WHERE id = NEW.target_id::uuid;
  ELSIF NEW.target_type = 'TERRITORY' THEN
    SELECT name INTO t_name FROM public.territories WHERE id = NEW.target_id::uuid;
  END IF;

  INSERT INTO public.activity_log (actor_user_id, action_type, target_type, target_id, target_name)
  VALUES (NEW.follower_id, 'followed', LOWER(NEW.target_type), NEW.target_id, t_name);
  RETURN NEW;
END;
$function$;
