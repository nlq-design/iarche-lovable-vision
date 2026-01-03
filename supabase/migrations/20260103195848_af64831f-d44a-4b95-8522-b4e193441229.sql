-- Drop the old constraint and add new one with ALL resource types (Content + Cockpit)
ALTER TABLE resource_embeddings 
DROP CONSTRAINT IF EXISTS resource_embeddings_resource_type_check;

ALTER TABLE resource_embeddings 
ADD CONSTRAINT resource_embeddings_resource_type_check 
CHECK (resource_type = ANY (ARRAY[
  -- Content types
  'service'::text, 
  'article'::text, 
  'actualite'::text, 
  'livre-blanc'::text, 
  'atelier-webinaire'::text, 
  'solution'::text, 
  'cas-client'::text,
  -- Cockpit types
  'lead'::text,
  'project'::text,
  'partner'::text,
  'uploaded_file'::text,
  'specification'::text,
  'voice_transcription'::text,
  'generated_document'::text
]));