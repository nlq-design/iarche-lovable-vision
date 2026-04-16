-- 1. Colonne (idempotent)
ALTER TABLE public.opportunities 
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz;

-- 2. Backfill AVANT trigger
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