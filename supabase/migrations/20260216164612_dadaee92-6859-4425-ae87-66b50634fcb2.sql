
-- Rewrite the trigger function to use pg_net instead of extensions.http_post
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sb_url TEXT;
  _sb_key TEXT;
BEGIN
  -- Only fire for non-digest, non-DM types
  IF NEW.type IN ('AI_JOURNEY_DIGEST', 'DIRECT_MESSAGE') THEN
    RETURN NEW;
  END IF;

  -- Get URL and key from vault
  SELECT decrypted_secret INTO _sb_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _sb_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;

  IF _sb_url IS NOT NULL AND _sb_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := _sb_url || '/functions/v1/send-notification-email',
      body := jsonb_build_object('notification_id', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _sb_key
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;
