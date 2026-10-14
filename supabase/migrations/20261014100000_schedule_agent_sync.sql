-- Synchronisation automatique des agents externes (Space2…) : un appel toutes les 30 minutes à la fonction
-- agent-sync, qui traite tous les agents `sync_enabled` (lecture du flux, création des guildes, liens, événements).
--
-- Le secret n'est JAMAIS dans ce fichier : il est lu dans le Vault Supabase, sous le nom « CRON_SECRET »
-- (même valeur que le secret de fonction du même nom). S'il n'existe pas encore, l'appel est refusé par la
-- fonction (401) sans effet ; la synchro manuelle depuis l'interface continue de fonctionner.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET') THEN
    RAISE NOTICE 'Vault secret CRON_SECRET absent : le cron agent-sync sera refusé tant qu''il n''est pas créé.';
  END IF;
EXCEPTION WHEN undefined_table OR insufficient_privilege THEN
  RAISE NOTICE 'Vault inaccessible depuis la migration : vérifier le secret CRON_SECRET séparément.';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('agent-sync-30min');
EXCEPTION WHEN OTHERS THEN
  NULL; -- pas encore planifié
END $$;

SELECT cron.schedule(
  'agent-sync-30min',
  '*/30 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://anzeimppqytonfxrnqxp.supabase.co/functions/v1/agent-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $cron$
);
