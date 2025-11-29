-- Table pour stocker les tentatives de connexion échouées
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts(attempted_at);

-- Table pour stocker les comptes verrouillés
CREATE TABLE IF NOT EXISTS public.account_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  unlock_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index pour la table account_locks
CREATE INDEX idx_account_locks_email ON public.account_locks(email);
CREATE INDEX idx_account_locks_locked_until ON public.account_locks(locked_until);

-- Table pour stocker les informations de backup
CREATE TABLE IF NOT EXISTS public.database_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL, -- 'manual' ou 'scheduled'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  file_size_bytes BIGINT,
  tables_backed_up TEXT[],
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index pour la table database_backups
CREATE INDEX idx_database_backups_status ON public.database_backups(status);
CREATE INDEX idx_database_backups_created_at ON public.database_backups(created_at);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour login_attempts (service role uniquement)
CREATE POLICY "Service role can manage login attempts"
  ON public.login_attempts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies pour account_locks (service role uniquement)
CREATE POLICY "Service role can manage account locks"
  ON public.account_locks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies pour database_backups (admins uniquement)
CREATE POLICY "Admins can view all backups"
  ON public.database_backups
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage backups"
  ON public.database_backups
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fonction pour nettoyer les anciennes tentatives de connexion (plus de 30 jours)
CREATE OR REPLACE FUNCTION public.cleanup_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Fonction pour déverrouiller automatiquement les comptes expirés
CREATE OR REPLACE FUNCTION public.unlock_expired_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.account_locks
  WHERE locked_until < NOW();
END;
$$;