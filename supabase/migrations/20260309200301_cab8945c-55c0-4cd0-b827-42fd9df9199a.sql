
CREATE OR REPLACE FUNCTION public.notify_ctg_earned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type LIKE 'EARNED_%' AND NEW.amount > 0 THEN
    INSERT INTO public.notifications (
      user_id, type, title, body, deep_link_url, created_at
    ) VALUES (
      NEW.user_id, 'CTG_EARNED',
      '🌱 +' || ROUND(NEW.amount::numeric, 2) || ' $CTG earned!',
      'For: ' || COALESCE(NEW.note, 'Contribution'),
      '/me?tab=wallet', now()
    );
  END IF;
  RETURN NEW;
END;$function$;
