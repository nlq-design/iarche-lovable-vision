-- Fix: cold_score should default to NULL (not scored) instead of 0 (scored with zero)
ALTER TABLE public.viviers ALTER COLUMN cold_score SET DEFAULT NULL;

-- Also fix existing leads that were imported with score 0 but are actually not scored
-- Only update leads with status 'new' and cold_score = 0 (likely auto-defaulted)
UPDATE public.viviers 
SET cold_score = NULL 
WHERE cold_score = 0 
  AND status = 'new' 
  AND scored_at IS NULL;