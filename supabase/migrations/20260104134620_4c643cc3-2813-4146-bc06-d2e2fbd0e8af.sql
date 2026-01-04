-- Table de dédoublonnage Telegram pour éviter les répétitions
CREATE TABLE IF NOT EXISTS public.telegram_processed_updates (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  response_preview TEXT, -- Premiers 200 caractères de la réponse
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour le nettoyage automatique des vieilles entrées
CREATE INDEX idx_telegram_updates_processed_at ON public.telegram_processed_updates(processed_at);

-- Fonction de nettoyage des entrées > 24h
CREATE OR REPLACE FUNCTION cleanup_old_telegram_updates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM telegram_processed_updates
  WHERE processed_at < now() - INTERVAL '24 hours';
END;
$$;

-- RLS désactivé (table interne, accès via service_role uniquement)
ALTER TABLE public.telegram_processed_updates ENABLE ROW LEVEL SECURITY;

-- Aucune policy = accès uniquement via service_role_key (sécurisé)

COMMENT ON TABLE public.telegram_processed_updates IS 'Stocke les update_id Telegram traités pour éviter les doublons lors des retries';