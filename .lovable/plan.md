

# Migration P0-A — Création colonne + trigger `set_stage_entered_at`

Audit confirmé : la colonne ET le trigger manquent. Migration unique idempotente.

## Migration SQL

```sql
-- 1. Colonne (idempotent)
ALTER TABLE public.opportunities 
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz;

-- 2. Backfill AVANT trigger (sinon NEW.stage_entered_at = now() au lieu de created_at)
UPDATE public.opportunities 
SET stage_entered_at = COALESCE(updated_at, created_at) 
WHERE stage_entered_at IS NULL;

-- 3. Fonction trigger
CREATE OR REPLACE FUNCTION public.set_stage_entered_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_entered_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Trigger BEFORE UPDATE OF stage (idempotent)
DROP TRIGGER IF EXISTS set_stage_entered_at ON public.opportunities;
CREATE TRIGGER set_stage_entered_at
  BEFORE UPDATE OF stage ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stage_entered_at();
```

## Vérifications post-migration (à coller en réponse)

```sql
-- A. Colonne créée
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema='public' AND table_name='opportunities' AND column_name='stage_entered_at';

-- B. Fonction présente
SELECT proname FROM pg_proc WHERE proname='set_stage_entered_at';

-- C. Trigger actif
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name='set_stage_entered_at';

-- D. Backfill complet (attendu : restants=0, total=26)
SELECT 
  COUNT(*) FILTER (WHERE stage_entered_at IS NULL) AS restants,
  COUNT(*) AS total
FROM public.opportunities;
```

## Périmètre strict

- Aucune autre table touchée
- Aucun front modifié
- Aucun autre trigger / fonction modifié
- Migration entièrement réversible

## Note

La vérification exhaustive du reste de P0-A (11 colonnes attendues sur opportunities/leads/projects) sera traitée dans un prompt suivant, après confirmation de cette migration.

