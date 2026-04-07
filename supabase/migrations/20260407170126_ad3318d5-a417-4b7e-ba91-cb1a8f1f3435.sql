UPDATE voice_transcriptions
SET 
  status = 'done',
  ai_metadata = ai_metadata - 'force_reanalyze' - 'force_retranscribe' - 'queued_at' - 'queued_by'
WHERE status IN ('queued', 'analyzing')
  AND (ai_metadata->>'force_reanalyze')::boolean = true;