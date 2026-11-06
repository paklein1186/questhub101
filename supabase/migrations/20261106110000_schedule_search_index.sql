-- Mise à jour de l'index de recherche toutes les 15 minutes (même principe que agent-sync : le secret est lu
-- dans le Vault sous le nom CRON_SECRET, jamais écrit ici).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('search-index-sync-15min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'search-index-sync-15min',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://anzeimppqytonfxrnqxp.supabase.co/functions/v1/search-index-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
