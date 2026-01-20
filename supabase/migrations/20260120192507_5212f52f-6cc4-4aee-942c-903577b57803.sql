-- =====================================================
-- Phase 1.5: Drop and recreate upsert_lead with workspace_id
-- =====================================================

-- Drop the existing function with exact signature
DROP FUNCTION IF EXISTS public.upsert_lead(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT);

-- Recreate with workspace_id parameter
CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_email TEXT,
  p_name TEXT,
  p_source TEXT,
  p_source_id UUID DEFAULT NULL,
  p_source_context TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_consent_marketing BOOLEAN DEFAULT false,
  p_qualification_status TEXT DEFAULT 'new',
  p_workspace_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Validate required fields
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  
  IF p_source IS NULL OR p_source = '' THEN
    RAISE EXCEPTION 'Source is required';
  END IF;

  -- Validate email format (basic check)
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Perform upsert with ON CONFLICT on email
  INSERT INTO public.leads (
    email,
    name,
    source,
    source_id,
    source_context,
    company,
    phone,
    message,
    consent_marketing,
    qualification_status,
    workspace_id
  ) VALUES (
    LOWER(TRIM(p_email)),
    TRIM(p_name),
    p_source,
    p_source_id,
    p_source_context,
    NULLIF(TRIM(p_company), ''),
    NULLIF(TRIM(p_phone), ''),
    p_message,
    p_consent_marketing,
    COALESCE(p_qualification_status, 'new'),
    COALESCE(p_workspace_id, '00000000-0000-0000-0000-000000000001')
  )
  ON CONFLICT (email) DO UPDATE SET
    last_contacted_at = NOW(),
    source_context = CASE 
      WHEN leads.source_context IS NULL THEN EXCLUDED.source_context
      WHEN EXCLUDED.source_context IS NULL THEN leads.source_context
      ELSE leads.source_context || ' | ' || EXCLUDED.source_context
    END,
    company = COALESCE(NULLIF(TRIM(EXCLUDED.company), ''), leads.company),
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), leads.phone),
    message = CASE
      WHEN leads.message IS NULL THEN EXCLUDED.message
      WHEN EXCLUDED.message IS NULL THEN leads.message
      ELSE leads.message || E'\n---\n' || EXCLUDED.message
    END,
    workspace_id = COALESCE(leads.workspace_id, EXCLUDED.workspace_id)
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.upsert_lead(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.upsert_lead IS 
'Secure lead upsert with multi-tenant workspace_id support. Defaults to IArche Interne workspace.';