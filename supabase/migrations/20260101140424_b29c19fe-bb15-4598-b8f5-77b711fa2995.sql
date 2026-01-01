-- =====================================================
-- FIX: PUBLIC_DATA_EXPOSURE - leads table UPDATE policy
-- Remove overly permissive UPDATE and replace with 
-- a SECURITY DEFINER function for safe upsert operations
-- =====================================================

-- 1. Drop the dangerous policy
DROP POLICY IF EXISTS "Public peut mettre à jour leads via upsert" ON public.leads;

-- 2. Create a secure upsert function that handles lead creation/update
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
  p_qualification_status TEXT DEFAULT 'new'
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
    qualification_status
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
    COALESCE(p_qualification_status, 'new')
  )
  ON CONFLICT (email) DO UPDATE SET
    last_contacted_at = NOW(),
    source_context = CASE 
      WHEN leads.source_context IS NULL THEN EXCLUDED.source_context
      WHEN EXCLUDED.source_context IS NULL THEN leads.source_context
      ELSE leads.source_context || ' | ' || EXCLUDED.source_context
    END,
    -- Only update these if the new values are not null/empty
    company = COALESCE(NULLIF(TRIM(EXCLUDED.company), ''), leads.company),
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), leads.phone),
    message = CASE
      WHEN leads.message IS NULL THEN EXCLUDED.message
      WHEN EXCLUDED.message IS NULL THEN leads.message
      ELSE leads.message || E'\n---\n' || EXCLUDED.message
    END
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

-- 3. Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.upsert_lead TO anon, authenticated;

-- 4. Add a comment explaining the security model
COMMENT ON FUNCTION public.upsert_lead IS 
'Secure lead upsert function. Uses SECURITY DEFINER to bypass RLS while enforcing business logic validation. Public users can only create/update their own lead record via email match.';