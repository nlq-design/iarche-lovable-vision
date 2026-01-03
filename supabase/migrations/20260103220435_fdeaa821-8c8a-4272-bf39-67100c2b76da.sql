-- Ajout des colonnes pour le workflow de validation du dictionnaire
ALTER TABLE public.keyword_aliases
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected')),
ADD COLUMN IF NOT EXISTS detected_count integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS first_detected_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS validated_by uuid,
ADD COLUMN IF NOT EXISTS source_examples jsonb DEFAULT '[]'::jsonb;

-- Mettre les entrées existantes comme validées (elles ont déjà été créées manuellement)
UPDATE public.keyword_aliases 
SET status = 'validated', validated_at = created_at 
WHERE status = 'pending';

-- Index pour les requêtes de notification (mots en attente)
CREATE INDEX IF NOT EXISTS idx_keyword_aliases_pending 
ON public.keyword_aliases(status) 
WHERE status = 'pending';

-- Commentaires pour documentation
COMMENT ON COLUMN public.keyword_aliases.status IS 'pending = détecté par IA, validated = confirmé par admin, rejected = faux positif';
COMMENT ON COLUMN public.keyword_aliases.detected_count IS 'Nombre de fois où ce mot a été détecté';
COMMENT ON COLUMN public.keyword_aliases.source_examples IS 'Exemples de contextes où le mot a été trouvé [{source_type, source_id, excerpt}]';