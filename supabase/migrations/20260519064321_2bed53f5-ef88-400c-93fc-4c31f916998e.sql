
CREATE TABLE public.mcp_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  key_id uuid,
  tool_name text,
  status text NOT NULL CHECK (status IN ('ok','error')),
  error_code int,
  error_message text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_request_logs_ws_created ON public.mcp_request_logs(workspace_id, created_at DESC);
CREATE INDEX idx_mcp_request_logs_status ON public.mcp_request_logs(workspace_id, status, created_at DESC);

ALTER TABLE public.mcp_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members read mcp logs"
ON public.mcp_request_logs FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  OR workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);
