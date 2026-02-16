
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: call send-notification-email edge function on insert
CREATE OR REPLACE FUNCTION public.trigger_notification_email()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _sb_url TEXT;
  _sb_key TEXT;
BEGIN
  -- Only fire for non-digest, non-DM types (DMs have their own email path)
  IF NEW.type IN ('AI_JOURNEY_DIGEST', 'DIRECT_MESSAGE') THEN
    RETURN NEW;
  END IF;

  _sb_url := current_setting('app.settings.supabase_url', true);
  _sb_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- If settings aren't available, try vault secrets
  IF _sb_url IS NULL OR _sb_url = '' THEN
    SELECT decrypted_secret INTO _sb_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  END IF;
  IF _sb_key IS NULL OR _sb_key = '' THEN
    SELECT decrypted_secret INTO _sb_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_ANON_KEY' LIMIT 1;
  END IF;

  IF _sb_url IS NOT NULL AND _sb_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := _sb_url || '/functions/v1/send-notification-email',
      body := jsonb_build_object('notification_id', NEW.id)::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _sb_key
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_send_notification_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notification_email();
