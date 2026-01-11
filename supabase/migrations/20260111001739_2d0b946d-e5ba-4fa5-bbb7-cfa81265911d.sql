-- Table for saving vivier target lists (Phase 3)
CREATE TABLE IF NOT EXISTS public.vivier_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  list_type TEXT NOT NULL DEFAULT 'dynamic' CHECK (list_type IN ('dynamic', 'static')),
  criteria_json JSONB DEFAULT '{}',
  static_vivier_ids UUID[] DEFAULT '{}',
  lead_count INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- Enable RLS
ALTER TABLE public.vivier_lists ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view vivier lists"
  ON public.vivier_lists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create vivier lists"
  ON public.vivier_lists FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vivier lists"
  ON public.vivier_lists FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete vivier lists"
  ON public.vivier_lists FOR DELETE
  TO authenticated
  USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vivier_lists_created_at ON public.vivier_lists (created_at DESC);

-- Add scoring_batch_id to track batch scoring jobs
ALTER TABLE public.viviers ADD COLUMN IF NOT EXISTS scoring_batch_id UUID;
ALTER TABLE public.viviers ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;

-- Index for batch scoring queries
CREATE INDEX IF NOT EXISTS idx_viviers_scoring_batch ON public.viviers (scoring_batch_id) WHERE scoring_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_viviers_unscored ON public.viviers (created_at) WHERE cold_score IS NULL AND status != 'promoted';