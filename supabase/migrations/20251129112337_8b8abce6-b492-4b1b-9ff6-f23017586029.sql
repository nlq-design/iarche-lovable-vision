-- Ajouter des colonnes pour les logs détaillés et le monitoring en temps réel
ALTER TABLE public.database_backups 
ADD COLUMN IF NOT EXISTS execution_logs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_table TEXT,
ADD COLUMN IF NOT EXISTS integrity_check_status TEXT,
ADD COLUMN IF NOT EXISTS integrity_check_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS restoration_possible BOOLEAN DEFAULT true;

-- Fonction pour ajouter des logs à un backup
CREATE OR REPLACE FUNCTION public.add_backup_log(
  backup_id UUID,
  log_level TEXT,
  log_message TEXT,
  log_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.database_backups
  SET execution_logs = execution_logs || jsonb_build_object(
    'timestamp', now(),
    'level', log_level,
    'message', log_message,
    'details', log_details
  )
  WHERE id = backup_id;
END;
$$;

-- Activer Realtime pour la table database_backups
ALTER PUBLICATION supabase_realtime ADD TABLE public.database_backups;