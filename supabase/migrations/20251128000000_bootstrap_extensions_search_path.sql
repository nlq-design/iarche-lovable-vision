-- ============================================================================
-- Bootstrap — Migration Supabase autonome
-- Doit s'exécuter AVANT toutes les autres migrations (timestamp le plus ancien).
--
-- Objectif : garantir que les objets des extensions (pgcrypto, pg_trgm, vector,
-- …) installés dans le schéma `extensions` soient résolvables SANS préfixe de
-- schéma dans toutes les migrations suivantes. Sur le projet d'origine (Lovable),
-- `extensions` était déjà dans le search_path par défaut ; ce n'est pas le cas
-- sur un projet fraîchement créé, d'où les erreurs "type vector does not exist"
-- / "function gen_random_bytes does not exist".
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;

-- Extensions utilisées tôt dans l'historique (avant leur CREATE EXTENSION d'origine)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- search_path persistant pour toutes les nouvelles connexions (rôle + base)
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;
ALTER ROLE postgres SET search_path TO "$user", public, extensions;

-- search_path pour la transaction courante (filet de sécurité immédiat)
SET search_path TO public, extensions;
