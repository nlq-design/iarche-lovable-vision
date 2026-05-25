ALTER TABLE public.generated_documents DROP CONSTRAINT generated_documents_document_type_check;
ALTER TABLE public.generated_documents ADD CONSTRAINT generated_documents_document_type_check
  CHECK (document_type = ANY (ARRAY['quote'::text, 'proposal'::text, 'spec'::text, 'report'::text, 'email'::text, 'contract'::text, 'invitation'::text, 'training_program'::text]));