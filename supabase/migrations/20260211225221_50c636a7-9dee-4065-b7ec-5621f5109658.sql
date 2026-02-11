-- Add missing columns referenced by ai-sentinel and cockpit queries

-- leads: add updated_at (auto-maintained), status, budget
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS budget NUMERIC;

-- Backfill updated_at from created_at
UPDATE public.leads SET updated_at = created_at WHERE updated_at IS NULL;

-- Create trigger to auto-update leads.updated_at
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_leads_updated_at ON public.leads;
CREATE TRIGGER trigger_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leads_updated_at();

-- opportunities: add expected_revenue as alias/computed convenience
-- (value_amount already exists, add expected_revenue for sentinel compatibility)
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS expected_revenue NUMERIC;

-- Backfill expected_revenue from value_amount * probability/100
UPDATE public.opportunities 
SET expected_revenue = COALESCE(value_amount, 0) * COALESCE(probability, 50) / 100.0
WHERE expected_revenue IS NULL;

-- partners: add expertise text column (specialties is array, expertise is summary text)
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS expertise TEXT;

-- projects: add planned_end_date as alias for target_end_date
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS planned_end_date DATE;

-- Backfill planned_end_date from target_end_date
UPDATE public.projects SET planned_end_date = target_end_date WHERE planned_end_date IS NULL AND target_end_date IS NOT NULL;