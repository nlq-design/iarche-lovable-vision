-- =============================================
-- Module Upload Cockpit - Phase 1
-- Table uploaded_files + bucket + RLS
-- =============================================

-- 1. Table uploaded_files
CREATE TABLE public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  
  -- Métadonnées fichier
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'pasted_text', 'xlsx', 'image'
  mime_type TEXT,
  file_size_bytes BIGINT,
  storage_path TEXT, -- Chemin dans le bucket Storage
  content_hash TEXT, -- SHA-256 pour déduplication
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL,
  is_latest BOOLEAN DEFAULT true,
  
  -- Contenu extrait par IA
  extracted_content TEXT,
  ai_summary TEXT,
  ai_metadata JSONB DEFAULT '{}',
  
  -- OCR
  ocr_required BOOLEAN DEFAULT false,
  ocr_provider TEXT, -- 'openai', 'anthropic', 'openrouter'
  ocr_confidence FLOAT,
  
  -- Liaisons multi-entités (arrays pour multi-liaison)
  project_ids UUID[] DEFAULT '{}',
  solution_ids UUID[] DEFAULT '{}',
  lead_ids UUID[] DEFAULT '{}',
  generated_document_id UUID REFERENCES generated_documents(id) ON DELETE SET NULL,
  
  -- Catégorisation
  category TEXT, -- 'commercial', 'technique', 'juridique', 'rh', 'autre'
  tags TEXT[] DEFAULT '{}',
  
  -- Partage
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  share_password_hash TEXT,
  download_count INTEGER DEFAULT 0,
  
  -- Statut traitement
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, needs_ocr
  processing_error TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Audit
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index pour performance
CREATE INDEX idx_uploaded_files_workspace ON uploaded_files(workspace_id);
CREATE INDEX idx_uploaded_files_projects ON uploaded_files USING GIN(project_ids);
CREATE INDEX idx_uploaded_files_leads ON uploaded_files USING GIN(lead_ids);
CREATE INDEX idx_uploaded_files_solutions ON uploaded_files USING GIN(solution_ids);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(processing_status);
CREATE INDEX idx_uploaded_files_category ON uploaded_files(category);
CREATE INDEX idx_uploaded_files_tags ON uploaded_files USING GIN(tags);
CREATE INDEX idx_uploaded_files_hash ON uploaded_files(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX idx_uploaded_files_latest ON uploaded_files(parent_file_id, is_latest) WHERE is_latest = true;
CREATE INDEX idx_uploaded_files_share ON uploaded_files(share_token) WHERE share_token IS NOT NULL;

-- 3. Enable RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "uploaded_files_select" ON uploaded_files
  FOR SELECT USING (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "uploaded_files_insert" ON uploaded_files
  FOR INSERT WITH CHECK (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "uploaded_files_update" ON uploaded_files
  FOR UPDATE USING (can_access_entity_workspace(workspace_id, auth.uid()));

CREATE POLICY "uploaded_files_delete" ON uploaded_files
  FOR DELETE USING (has_role(auth.uid(), 'cockpit_admin'));

-- 5. Trigger updated_at
CREATE TRIGGER set_uploaded_files_updated_at
  BEFORE UPDATE ON uploaded_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Trigger activity_log sur nouvel upload
CREATE OR REPLACE FUNCTION log_file_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_log (
    workspace_id,
    entity_type,
    entity_id,
    activity_type,
    title,
    content,
    pending_ai_review,
    metadata
  ) VALUES (
    NEW.workspace_id,
    'uploaded_file',
    NEW.id,
    'new_upload',
    'Nouveau fichier : ' || NEW.original_filename,
    'Fichier ' || NEW.file_type || ' uploadé (' || COALESCE(NEW.file_size_bytes::text, '?') || ' bytes)',
    true,
    jsonb_build_object(
      'file_type', NEW.file_type,
      'file_size', NEW.file_size_bytes,
      'category', NEW.category
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_file_upload
  AFTER INSERT ON uploaded_files
  FOR EACH ROW EXECUTE FUNCTION log_file_upload();

-- 7. Bucket Storage cockpit-uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cockpit-uploads',
  'cockpit-uploads',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
);

-- 8. Storage RLS Policies
CREATE POLICY "cockpit_uploads_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'cockpit-uploads'
  AND (
    has_role(auth.uid(), 'cockpit_user')
    OR has_role(auth.uid(), 'cockpit_admin')
    OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "cockpit_uploads_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cockpit-uploads'
  AND (
    has_role(auth.uid(), 'cockpit_user')
    OR has_role(auth.uid(), 'cockpit_admin')
    OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "cockpit_uploads_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'cockpit-uploads'
  AND (
    has_role(auth.uid(), 'cockpit_user')
    OR has_role(auth.uid(), 'cockpit_admin')
    OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "cockpit_uploads_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'cockpit-uploads'
  AND has_role(auth.uid(), 'cockpit_admin')
);

-- 9. Fonction génération lien partage
CREATE OR REPLACE FUNCTION generate_file_share_link(
  p_file_id UUID,
  p_expires_in_days INTEGER DEFAULT 7,
  p_password TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_password_hash TEXT;
BEGIN
  -- Vérifier accès
  IF NOT EXISTS (
    SELECT 1 FROM uploaded_files 
    WHERE id = p_file_id 
    AND can_access_entity_workspace(workspace_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Générer token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Hash password si fourni
  IF p_password IS NOT NULL AND p_password != '' THEN
    v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
  END IF;
  
  -- Mettre à jour fichier
  UPDATE uploaded_files 
  SET 
    share_token = v_token,
    share_expires_at = now() + (p_expires_in_days || ' days')::interval,
    share_password_hash = v_password_hash
  WHERE id = p_file_id;
  
  RETURN v_token;
END;
$$;

-- 10. Fonction vérification accès partage
CREATE OR REPLACE FUNCTION verify_file_share_access(
  p_token TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS TABLE (
  file_id UUID,
  original_filename TEXT,
  file_type TEXT,
  storage_path TEXT,
  valid BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file RECORD;
  v_password_hash TEXT;
BEGIN
  -- Chercher fichier par token
  SELECT * INTO v_file
  FROM uploaded_files
  WHERE share_token = p_token;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false, 'Invalid share link';
    RETURN;
  END IF;
  
  -- Vérifier expiration
  IF v_file.share_expires_at < now() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false, 'Share link expired';
    RETURN;
  END IF;
  
  -- Vérifier mot de passe si requis
  IF v_file.share_password_hash IS NOT NULL THEN
    IF p_password IS NULL OR p_password = '' THEN
      RETURN QUERY SELECT v_file.id, v_file.original_filename, v_file.file_type, NULL::TEXT, false, 'Password required';
      RETURN;
    END IF;
    
    v_password_hash := encode(digest(p_password, 'sha256'), 'hex');
    IF v_password_hash != v_file.share_password_hash THEN
      RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, false, 'Invalid password';
      RETURN;
    END IF;
  END IF;
  
  -- Incrémenter compteur téléchargement
  UPDATE uploaded_files SET download_count = download_count + 1 WHERE id = v_file.id;
  
  RETURN QUERY SELECT v_file.id, v_file.original_filename, v_file.file_type, v_file.storage_path, true, NULL::TEXT;
END;
$$;