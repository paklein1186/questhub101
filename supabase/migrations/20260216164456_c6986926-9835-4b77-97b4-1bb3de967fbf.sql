
-- Store the Supabase URL and anon key in vault so the notification trigger can call edge functions
SELECT vault.create_secret('https://anzeimppqytonfxrnqxp.supabase.co', 'SUPABASE_URL');
SELECT vault.create_secret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuemVpbXBwcXl0b25meHJucXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2Nzk2NDUsImV4cCI6MjA4NjI1NTY0NX0.l6GaeRYwYJWRoOc5hVFgVXD_c7ogCrsodd1f0mOIoCw', 'SUPABASE_ANON_KEY');
