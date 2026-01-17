-- =============================================
-- VIVIER CAMPAIGN STATS: Track engagement levels
-- =============================================

-- Table to store aggregated campaign stats per vivier
CREATE TABLE public.vivier_campaign_stats (
  vivier_id UUID PRIMARY KEY REFERENCES public.viviers(id) ON DELETE CASCADE,
  campaign_count INTEGER NOT NULL DEFAULT 0,
  has_opened BOOLEAN NOT NULL DEFAULT false,
  has_clicked BOOLEAN NOT NULL DEFAULT false,
  has_bounced BOOLEAN NOT NULL DEFAULT false,
  has_unsubscribed BOOLEAN NOT NULL DEFAULT false,
  first_campaign_at TIMESTAMPTZ,
  last_campaign_at TIMESTAMPTZ,
  last_open_at TIMESTAMPTZ,
  last_click_at TIMESTAMPTZ,
  promoted_to_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vivier_campaign_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using has_cockpit_access with auth.uid())
CREATE POLICY "Cockpit users can view vivier campaign stats"
  ON public.vivier_campaign_stats FOR SELECT
  USING (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can insert vivier campaign stats"
  ON public.vivier_campaign_stats FOR INSERT
  WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can update vivier campaign stats"
  ON public.vivier_campaign_stats FOR UPDATE
  USING (public.has_cockpit_access(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_vivier_campaign_stats_campaign_count 
  ON public.vivier_campaign_stats(campaign_count);
CREATE INDEX idx_vivier_campaign_stats_bounced 
  ON public.vivier_campaign_stats(has_bounced) WHERE has_bounced = true;
CREATE INDEX idx_vivier_campaign_stats_promoted 
  ON public.vivier_campaign_stats(promoted_to_lead_id) WHERE promoted_to_lead_id IS NOT NULL;

-- =============================================
-- RPC: Get vivier engagement color codes (batched)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_vivier_engagement_stats(p_vivier_ids UUID[])
RETURNS TABLE (
  vivier_id UUID,
  campaign_count INTEGER,
  has_opened BOOLEAN,
  has_clicked BOOLEAN,
  has_bounced BOOLEAN,
  engagement_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check cockpit access
  IF NOT public.has_cockpit_access(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    vid.id AS vivier_id,
    COALESCE(vcs.campaign_count, 0)::INTEGER as campaign_count,
    COALESCE(vcs.has_opened, false) as has_opened,
    COALESCE(vcs.has_clicked, false) as has_clicked,
    COALESCE(vcs.has_bounced, false) as has_bounced,
    CASE
      WHEN COALESCE(vcs.has_bounced, false) OR COALESCE(vcs.has_unsubscribed, false) THEN 'bounced'
      WHEN COALESCE(vcs.has_opened, false) OR COALESCE(vcs.has_clicked, false) THEN 'engaged'
      WHEN COALESCE(vcs.campaign_count, 0) >= 2 THEN 'multi_campaign'
      WHEN COALESCE(vcs.campaign_count, 0) = 1 THEN 'single_campaign'
      ELSE 'never_contacted'
    END::TEXT as engagement_level
  FROM unnest(p_vivier_ids) AS vid(id)
  LEFT JOIN public.vivier_campaign_stats vcs ON vcs.vivier_id = vid.id;
END;
$$;

-- =============================================
-- RPC: Promote vivier to lead
-- =============================================
CREATE OR REPLACE FUNCTION public.promote_vivier_to_lead(
  p_vivier_id UUID,
  p_qualification_status TEXT DEFAULT 'new'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vivier RECORD;
  v_lead_id UUID;
  v_existing_lead_id UUID;
BEGIN
  -- Check cockpit access
  IF NOT public.has_cockpit_access(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get vivier data
  SELECT * INTO v_vivier FROM public.viviers WHERE id = p_vivier_id;
  
  IF v_vivier IS NULL THEN
    RAISE EXCEPTION 'Vivier not found';
  END IF;

  -- Check if already promoted
  SELECT promoted_to_lead_id INTO v_existing_lead_id 
  FROM public.vivier_campaign_stats 
  WHERE vivier_id = p_vivier_id;
  
  IF v_existing_lead_id IS NOT NULL THEN
    RETURN v_existing_lead_id;
  END IF;

  -- Check if lead with same email exists
  SELECT id INTO v_existing_lead_id 
  FROM public.leads 
  WHERE email = v_vivier.email;
  
  IF v_existing_lead_id IS NOT NULL THEN
    -- Update stats to link to existing lead
    INSERT INTO public.vivier_campaign_stats (vivier_id, promoted_to_lead_id, promoted_at)
    VALUES (p_vivier_id, v_existing_lead_id, now())
    ON CONFLICT (vivier_id) DO UPDATE SET
      promoted_to_lead_id = v_existing_lead_id,
      promoted_at = now(),
      updated_at = now();
    
    RETURN v_existing_lead_id;
  END IF;

  -- Create new lead from vivier
  INSERT INTO public.leads (
    name,
    email,
    phone,
    company,
    industry,
    city,
    postal_code,
    address,
    siret,
    source,
    source_context,
    qualification_status
  ) VALUES (
    COALESCE(v_vivier.contact_name, v_vivier.contact_first_name || ' ' || v_vivier.contact_last_name, v_vivier.company_name, 'Contact'),
    v_vivier.email,
    v_vivier.phone,
    v_vivier.company_name,
    v_vivier.industry,
    v_vivier.city,
    v_vivier.postal_code,
    v_vivier.address,
    v_vivier.siret,
    'cold-outreach',
    'Promoted from vivier campaign',
    p_qualification_status
  )
  RETURNING id INTO v_lead_id;

  -- Update vivier status
  UPDATE public.viviers 
  SET status = 'promoted', updated_at = now()
  WHERE id = p_vivier_id;

  -- Update campaign stats
  INSERT INTO public.vivier_campaign_stats (vivier_id, promoted_to_lead_id, promoted_at)
  VALUES (p_vivier_id, v_lead_id, now())
  ON CONFLICT (vivier_id) DO UPDATE SET
    promoted_to_lead_id = v_lead_id,
    promoted_at = now(),
    updated_at = now();

  RETURN v_lead_id;
END;
$$;

-- =============================================
-- Trigger: Update stats when campaign recipient added
-- =============================================
CREATE OR REPLACE FUNCTION public.update_vivier_campaign_stats_on_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vivier_campaign_stats (
    vivier_id,
    campaign_count,
    first_campaign_at,
    last_campaign_at
  ) VALUES (
    NEW.vivier_id,
    1,
    now(),
    now()
  )
  ON CONFLICT (vivier_id) DO UPDATE SET
    campaign_count = vivier_campaign_stats.campaign_count + 1,
    last_campaign_at = now(),
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';