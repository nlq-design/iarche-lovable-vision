-- Cron : déclenche le worker de transcription chaque minute.
-- transcription-worker (edge function) poll les jobs AssemblyAI en cours,
-- ramasse les jobs `queued` et débloque les jobs stale.
--
-- Recréé le 2026-06-29 : ce cron avait été perdu lors de la migration
-- off-Lovable (les jobs restaient bloqués en `queued` → "ça mouline").
-- Idempotent : on retire l'ancien schedule s'il existe, puis on (re)crée.
--
-- NB : le Bearer est la clé ANON (publishable, déjà exposée côté client),
-- pas la service_role. Le worker utilise SUPABASE_SERVICE_ROLE_KEY en interne.

select cron.unschedule('transcription-worker-poll')
where exists (select 1 from cron.job where jobname = 'transcription-worker-poll');

select cron.schedule(
  'transcription-worker-poll',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://xzlnurunjuinmmlctdid.supabase.co/functions/v1/transcription-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bG51cnVuanVpbm1tbGN0ZGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjk3NzgsImV4cCI6MjA5Njc0NTc3OH0.b-jhL43KYl_B5Ygk6nM4e8imNs4aBuwzl0NtC0Vqhmg'
    ),
    body := '{}'::jsonb
  );
  $$
);
