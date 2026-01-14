-- =============================================================================
-- SECURITY FIX: Warn-level issues from security scan
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX: Functions without search_path
-- -----------------------------------------------------------------------------

-- Fix generate_campaign_slug
CREATE OR REPLACE FUNCTION public.generate_campaign_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := substr(gen_random_uuid()::text, 1, 8);
  END IF;
  
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.vivier_campaigns WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$function$;

-- Fix update_vivier_campaign_recipients_updated_at
CREATE OR REPLACE FUNCTION public.update_vivier_campaign_recipients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 2. FIX: Cockpit MFA verification at database level
-- -----------------------------------------------------------------------------

-- Update has_cockpit_access to verify MFA session exists
CREATE OR REPLACE FUNCTION public.has_cockpit_access(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Check role AND active MFA session
  RETURN (
    public.has_role(user_uuid, 'cockpit_user') OR 
    public.has_role(user_uuid, 'cockpit_admin')
  ) AND EXISTS (
    SELECT 1 FROM public.cockpit_auth_sessions
    WHERE user_id = user_uuid
    AND expires_at > NOW()
  );
END;
$function$;

-- -----------------------------------------------------------------------------
-- 3. FIX: Overly permissive RLS policies - Add validation
-- -----------------------------------------------------------------------------

-- Drop and recreate contacts INSERT policy with validation
DROP POLICY IF EXISTS "Public insert contacts permissive" ON public.contacts;
CREATE POLICY "Public insert contacts with validation"
ON public.contacts FOR INSERT TO anon, authenticated
WITH CHECK (
  LENGTH(name) >= 2 AND LENGTH(name) <= 200 AND
  LENGTH(message) >= 10 AND LENGTH(message) <= 10000 AND
  LENGTH(subject) >= 2 AND LENGTH(subject) <= 500 AND
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  LENGTH(email) <= 320
);

-- Drop and recreate form_responses INSERT policy with validation
DROP POLICY IF EXISTS "Public peut soumettre responses" ON public.form_responses;
CREATE POLICY "Public form responses with validation"
ON public.form_responses FOR INSERT TO anon, authenticated
WITH CHECK (
  form_id IS NOT NULL AND
  data IS NOT NULL AND
  pg_column_size(data) <= 50000
);

-- Drop and recreate form_analytics INSERT policy with validation
DROP POLICY IF EXISTS "Public peut soumettre analytics" ON public.form_analytics;
CREATE POLICY "Public form analytics with validation"
ON public.form_analytics FOR INSERT TO anon, authenticated
WITH CHECK (
  form_id IS NOT NULL AND
  event_type IS NOT NULL AND
  LENGTH(event_type) <= 50
);

-- Drop and recreate atelier_inscriptions INSERT policy with validation
DROP POLICY IF EXISTS "Public peut créer inscriptions" ON public.atelier_inscriptions;
CREATE POLICY "Public atelier inscriptions with validation"
ON public.atelier_inscriptions FOR INSERT TO anon, authenticated
WITH CHECK (
  atelier_id IS NOT NULL AND
  lead_id IS NOT NULL
);

-- Drop and recreate newsletter_subscribers INSERT policy with validation
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Public newsletter subscription with validation"
ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  LENGTH(email) <= 320
);

-- Drop and recreate leads INSERT policy with validation
DROP POLICY IF EXISTS "Public peut créer leads" ON public.leads;
CREATE POLICY "Public leads with validation"
ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  LENGTH(email) <= 320 AND
  LENGTH(name) >= 2 AND LENGTH(name) <= 200 AND
  source IS NOT NULL AND LENGTH(source) <= 100
);

-- Drop and recreate comments INSERT policy with validation
DROP POLICY IF EXISTS "Anyone can submit comments" ON public.comments;
CREATE POLICY "Public comments with validation"
ON public.comments FOR INSERT TO anon, authenticated
WITH CHECK (
  article_id IS NOT NULL AND
  LENGTH(author_name) >= 2 AND LENGTH(author_name) <= 200 AND
  author_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  LENGTH(content) >= 10 AND LENGTH(content) <= 5000
);

-- Drop and recreate cta_clicks INSERT policy with validation
DROP POLICY IF EXISTS "Anyone can insert cta clicks" ON public.cta_clicks;
CREATE POLICY "Public cta clicks with validation"
ON public.cta_clicks FOR INSERT TO anon, authenticated
WITH CHECK (
  cta_name IS NOT NULL AND LENGTH(cta_name) <= 100 AND
  source_page IS NOT NULL AND LENGTH(source_page) <= 500
);

-- Drop and recreate search_queries INSERT policy with validation
DROP POLICY IF EXISTS "Anyone can insert search queries" ON public.search_queries;
CREATE POLICY "Public search queries with validation"
ON public.search_queries FOR INSERT TO anon, authenticated
WITH CHECK (
  query IS NOT NULL AND 
  LENGTH(query) >= 1 AND LENGTH(query) <= 500
);

-- Drop and recreate article_views INSERT policy with validation
DROP POLICY IF EXISTS "Anyone can track article views" ON public.article_views;
CREATE POLICY "Public article views with validation"
ON public.article_views FOR INSERT TO anon, authenticated
WITH CHECK (
  article_id IS NOT NULL
);

-- Drop and recreate bookings INSERT policy with validation
DROP POLICY IF EXISTS "Public can create bookings" ON public.bookings;
CREATE POLICY "Public bookings with validation"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (
  booking_type_id IS NOT NULL AND
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  LENGTH(email) <= 320 AND
  LENGTH(name) >= 2 AND LENGTH(name) <= 200 AND
  start_time IS NOT NULL AND
  end_time IS NOT NULL AND
  start_time < end_time
);

-- -----------------------------------------------------------------------------
-- 4. FIX: vivier_lists policies - Restrict to cockpit access
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can create vivier lists" ON public.vivier_lists;
DROP POLICY IF EXISTS "Authenticated users can update vivier lists" ON public.vivier_lists;
DROP POLICY IF EXISTS "Authenticated users can delete vivier lists" ON public.vivier_lists;

CREATE POLICY "Cockpit users can create vivier lists"
ON public.vivier_lists FOR INSERT TO authenticated
WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can update vivier lists"
ON public.vivier_lists FOR UPDATE TO authenticated
USING (public.has_cockpit_access(auth.uid()))
WITH CHECK (public.has_cockpit_access(auth.uid()));

CREATE POLICY "Cockpit users can delete vivier lists"
ON public.vivier_lists FOR DELETE TO authenticated
USING (public.has_cockpit_access(auth.uid()));