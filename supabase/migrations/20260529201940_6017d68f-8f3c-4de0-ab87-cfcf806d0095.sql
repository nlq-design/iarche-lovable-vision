ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS archived_by uuid NULL,
  ADD COLUMN IF NOT EXISTS archive_reason text NULL;

CREATE INDEX IF NOT EXISTS activity_log_active_idx
  ON public.activity_log(workspace_id, created_at DESC)
  WHERE archived_at IS NULL;

UPDATE public.activity_log
SET archived_at = now(),
    archive_reason = 'ghost-cleanup-2026-05-29'
WHERE created_at >= '2026-05-29 19:00:00'
  AND entity_type IN ('lead','project')
  AND entity_id NOT IN (SELECT id FROM public.leads UNION ALL SELECT id FROM public.projects)
  AND archived_at IS NULL;