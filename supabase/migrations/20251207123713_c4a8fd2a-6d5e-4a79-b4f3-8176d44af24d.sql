-- Recreate the view with SECURITY INVOKER (default, safer option)
DROP VIEW IF EXISTS public.comments_public;

CREATE VIEW public.comments_public 
WITH (security_invoker = true)
AS
SELECT
  id,
  article_id,
  author_name,
  content,
  approved,
  created_at,
  updated_at
FROM public.comments
WHERE approved = true;

-- Grant access to the view for anonymous and authenticated users
GRANT SELECT ON public.comments_public TO anon, authenticated;