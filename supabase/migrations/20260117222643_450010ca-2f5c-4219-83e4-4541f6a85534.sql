-- Speed up viviers list/search queries (avoid PostgREST statement timeouts)

-- Trigram extension for fast ILIKE '%...%' searches
create extension if not exists pg_trgm;

-- List view: status filter + sort by cold_score
create index if not exists idx_viviers_status_cold_score
  on public.viviers (status, cold_score desc nulls last);

-- Recent view: sort by created_at
create index if not exists idx_viviers_created_at_desc
  on public.viviers (created_at desc);

-- Search: ILIKE on email/company/contact
create index if not exists idx_viviers_email_trgm
  on public.viviers using gin (email gin_trgm_ops);

create index if not exists idx_viviers_company_name_trgm
  on public.viviers using gin (company_name gin_trgm_ops);

create index if not exists idx_viviers_contact_name_trgm
  on public.viviers using gin (contact_name gin_trgm_ops);
