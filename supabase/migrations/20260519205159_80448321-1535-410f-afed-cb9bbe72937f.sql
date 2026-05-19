ALTER TABLE public.resource_embeddings DROP CONSTRAINT IF EXISTS resource_embeddings_resource_type_check;
ALTER TABLE public.resource_embeddings ADD CONSTRAINT resource_embeddings_resource_type_check
CHECK (resource_type = ANY (ARRAY[
  'service','article','actualite','livre-blanc','atelier-webinaire','solution','cas-client',
  'lead','project','partner','uploaded_file','specification','voice_transcription','generated_document',
  'transcription_chunk','transcription_summary','lead_summary','opportunity','activity_log_agg',
  'entity_note','project_note','uploaded_file_chunk','agent_memory'
]));