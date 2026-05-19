ALTER TABLE public.resource_embeddings DROP CONSTRAINT IF EXISTS embeddings_workspace_scope_chk;
ALTER TABLE public.resource_embeddings ADD CONSTRAINT embeddings_workspace_scope_chk CHECK (
  (
    resource_type = ANY (ARRAY['article','actualite','cas-client','livre-blanc','atelier-webinaire','solution','service'])
    AND workspace_id IS NULL
  ) OR (
    resource_type = ANY (ARRAY['lead','project','partner','generated_document','uploaded_file','specification','voice_transcription','transcription_chunk','transcription_summary','lead_summary','opportunity','activity_log_agg','entity_note','project_note','uploaded_file_chunk','agent_memory'])
    AND workspace_id IS NOT NULL
  )
);