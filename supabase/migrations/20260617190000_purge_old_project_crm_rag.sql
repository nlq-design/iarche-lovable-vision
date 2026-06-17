-- ════════════════════════════════════════════════════════════════════════
-- Purge des références à l'ANCIEN projet (mgjyhlyrwnnioctkbdkk) dans
-- trigger_crm_rag_index : URL + JWT anon hardcodés → lecture depuis Vault,
-- défaut = nouveau projet (xzlnurunjuinmmlctdid). Même pattern que
-- telegram_notify (migration 20260611120000). Idempotente.
--
-- PRÉREQUIS OPÉRATEUR (une seule fois, côté nouveau projet) — voir présentation :
--   select vault.create_secret('https://xzlnurunjuinmmlctdid.supabase.co', 'project_url', '...');
--   select vault.create_secret('<ANON_KEY_NOUVEAU_PROJET>', 'project_anon_key', '...');
-- Sans project_anon_key, l'indexation RAG est ignorée (warning), pas d'appel
-- vers l'ancien projet.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.trigger_crm_rag_index()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url  text;
  v_key  text;
  v_type text := TG_ARGV[0];
BEGIN
  -- URL projet : Vault si présent, sinon défaut nouveau projet.
  BEGIN
    SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_url := NULL;
  END;
  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://xzlnurunjuinmmlctdid.supabase.co';
  END IF;

  -- Clé anon : uniquement depuis Vault, jamais hardcodée.
  BEGIN
    SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets WHERE name = 'project_anon_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_key := NULL;
  END;
  IF v_key IS NULL OR v_key = '' THEN
    RAISE WARNING 'trigger_crm_rag_index: secret Vault project_anon_key manquant — indexation RAG ignorée';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url || '/functions/v1/crm-rag-indexer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_key,
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('task', 'index', 'resource_type', v_type, 'resource_id', NEW.id::text)
  );
  RETURN NEW;
END;
$$;
