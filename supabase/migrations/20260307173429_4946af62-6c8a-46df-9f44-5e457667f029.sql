
-- Table mcp_api_keys : clés API révocables pour le serveur MCP
create table public.mcp_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) not null,
  user_id uuid not null,
  key_hash text not null unique,
  key_prefix text not null,
  label text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

alter table public.mcp_api_keys enable row level security;

create policy "Users manage own keys" on public.mcp_api_keys
  for all using (auth.uid() = user_id);

-- Table ai_sentinel_alerts : historique persisté des alertes Sentinel
create table public.ai_sentinel_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  category text not null,
  title text not null,
  description text,
  entity_type text,
  entity_id uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  ai_metadata jsonb,
  created_at timestamptz default now()
);

alter table public.ai_sentinel_alerts enable row level security;

create policy "Workspace access for sentinel alerts" on public.ai_sentinel_alerts
  for all using (public.can_access_workspace(workspace_id, auth.uid()));

-- Index pour les requêtes fréquentes
create index idx_mcp_api_keys_key_hash on public.mcp_api_keys(key_hash);
create index idx_mcp_api_keys_user_id on public.mcp_api_keys(user_id);
create index idx_sentinel_alerts_workspace on public.ai_sentinel_alerts(workspace_id, created_at desc);
create index idx_sentinel_alerts_severity on public.ai_sentinel_alerts(severity) where resolved_at is null;
