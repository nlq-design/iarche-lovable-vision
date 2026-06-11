-- ============================================================================
-- Migration corrective — Migration Lovable Cloud → Supabase autonome
-- Nouveau projet : xzlnurunjuinmmlctdid
-- Ancien projet  : mgjyhlyrwnnioctkbdkk (URL + JWT anon hardcodés à purger)
--
-- Idempotente : peut être rejouée sans effet de bord.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Bucket cockpit-uploads (garde de sûreté)
--    NOTE : le bucket ET ses policies (cockpit_user / cockpit_admin) existent
--    déjà dans la migration 20260101144456 (50 Mo, privé). On NE redéfinit PAS
--    les policies ici pour éviter tout conflit ; on garantit seulement la
--    présence du bucket au cas où il aurait été perdu/créé hors migration.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('cockpit-uploads', 'cockpit-uploads', false, 52428800)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 2. Bucket email-assets — service en URL publique (/object/public/email-assets)
--    Déjà public=true dans 20260421141848 ; on ré-assure public=true + policy
--    de lecture publique (idempotent) pour garantir le rendu des images email.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Email assets public read" ON storage.objects;
CREATE POLICY "Email assets public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-assets');


-- ----------------------------------------------------------------------------
-- 3. Telegram — purge de l'URL + Bearer JWT hardcodés (ancien projet)
--    Centralisation via un helper unique qui lit l'URL et la clé anon depuis
--    Supabase Vault. Ainsi, une future migration de projet ne nécessite AUCUN
--    changement SQL : il suffit de mettre à jour les secrets Vault.
--
--    PRÉREQUIS OPÉRATEUR (une seule fois, hors migration, côté nouveau projet) :
--      select vault.create_secret(
--        'https://xzlnurunjuinmmlctdid.supabase.co', 'project_url',
--        'Base URL projet pour appels pg_net');
--      select vault.create_secret(
--        '<ANON_KEY_DU_NOUVEAU_PROJET>', 'project_anon_key',
--        'Clé anon (Bearer) pour appels pg_net cron/triggers');
--    Si le secret project_url est absent, on retombe sur l'URL par défaut
--    ci-dessous. Si project_anon_key est absent, l'appel est ignoré (warning).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.telegram_notify(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  -- URL projet (non secrète) : Vault si présent, sinon défaut nouveau projet.
  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL; -- schéma vault absent / inaccessible
  END;
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://xzlnurunjuinmmlctdid.supabase.co';
  END IF;

  -- Clé anon (Bearer) : uniquement depuis Vault, jamais hardcodée.
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'project_anon_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;
  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'telegram_notify: secret Vault project_anon_key manquant — appel ignoré';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/telegram-proactive-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := payload
  );
END;
$$;

-- 3a. Triggers lead / booking — réécrits pour passer par le helper (purge JWT).
CREATE OR REPLACE FUNCTION public.notify_new_lead_telegram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.telegram_notify(jsonb_build_object(
    'type', 'new_lead',
    'entity_id', NEW.id::text
  ));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_booking_telegram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    PERFORM public.telegram_notify(jsonb_build_object(
      'type', 'new_booking',
      'entity_id', NEW.id::text
    ));
  END IF;
  RETURN NEW;
END;
$$;

-- 3b. Cron jobs — unschedule (si présents) puis re-schedule via le helper.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'telegram-task-reminders') THEN
    PERFORM cron.unschedule('telegram-task-reminders');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'telegram-morning-briefing') THEN
    PERFORM cron.unschedule('telegram-morning-briefing');
  END IF;
END $$;

SELECT cron.schedule(
  'telegram-task-reminders',
  '*/15 * * * *',
  $cron$ SELECT public.telegram_notify('{"action": "check_task_reminders"}'::jsonb); $cron$
);

SELECT cron.schedule(
  'telegram-morning-briefing',
  '*/5 7-9 * * *',
  $cron$ SELECT public.telegram_notify('{"action": "check_morning_briefing"}'::jsonb); $cron$
);


-- ----------------------------------------------------------------------------
-- 4. Realtime — s'assurer que les tables écoutées côté front sont publiées.
--    Bloc dynamique : n'ajoute que les tables EXISTANTES et ABSENTES de la
--    publication (idempotent, ne peut pas échouer si une table manque).
--    Couvre : dashboard cockpit (projects, partners), entity-links (tables de
--    jonction + voice_transcriptions/generated_documents/…), stats articles
--    (article_views). leads/opportunities/comments/partner_notifications/
--    database_backups sont déjà publiées par les migrations existantes.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  t text;
  wanted text[] := ARRAY[
    'projects', 'partners', 'article_views',
    'opportunities', 'voice_transcriptions', 'generated_documents',
    'specifications', 'solution_leads',
    'lead_partners', 'project_partners', 'solution_partners',
    'document_partners', 'transcription_partners'
  ];
BEGIN
  FOREACH t IN ARRAY wanted LOOP
    IF EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = t
       )
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public' AND tablename = t
       )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      RAISE NOTICE 'realtime: table public.% ajoutée à supabase_realtime', t;
    END IF;
  END LOOP;
END $$;
