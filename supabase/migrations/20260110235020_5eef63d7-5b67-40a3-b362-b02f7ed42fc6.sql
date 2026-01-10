-- Add indexes for optimized filtering on viviers table
-- These indexes significantly improve query performance for large datasets (30k+ rows)

-- Index for city filtering (used with ILIKE)
CREATE INDEX IF NOT EXISTS idx_viviers_city ON public.viviers (city);

-- Index for postal_code filtering (prefix matching)
CREATE INDEX IF NOT EXISTS idx_viviers_postal_code ON public.viviers (postal_code);

-- Index for industry filtering (used with ILIKE)
CREATE INDEX IF NOT EXISTS idx_viviers_industry ON public.viviers (industry);

-- Index for email (frequently searched)
CREATE INDEX IF NOT EXISTS idx_viviers_email ON public.viviers (email);

-- Index for company_name (frequently searched)
CREATE INDEX IF NOT EXISTS idx_viviers_company_name ON public.viviers (company_name);

-- Index for contact_name (frequently searched)
CREATE INDEX IF NOT EXISTS idx_viviers_contact_name ON public.viviers (contact_name);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_viviers_status ON public.viviers (status);

-- Index for score range queries
CREATE INDEX IF NOT EXISTS idx_viviers_cold_score ON public.viviers (cold_score);

-- Composite index for common filter combinations (status + score)
CREATE INDEX IF NOT EXISTS idx_viviers_status_score ON public.viviers (status, cold_score);

-- Index for created_at ordering (used in all queries)
CREATE INDEX IF NOT EXISTS idx_viviers_created_at ON public.viviers (created_at DESC);