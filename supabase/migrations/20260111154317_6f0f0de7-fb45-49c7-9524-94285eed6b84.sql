-- Index trigram pour recherche ILIKE performante sur 100k+ lignes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index GIN trigram pour la recherche rapide (email, company, contact)
CREATE INDEX IF NOT EXISTS idx_viviers_email_trgm ON public.viviers USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_viviers_company_trgm ON public.viviers USING gin (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_viviers_contact_trgm ON public.viviers USING gin (contact_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_viviers_city_trgm ON public.viviers USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_viviers_industry_trgm ON public.viviers USING gin (industry gin_trgm_ops);