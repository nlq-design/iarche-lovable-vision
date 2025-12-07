-- Create a secure view for public comment access that excludes author_email
CREATE OR REPLACE VIEW public.comments_public AS
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

-- Drop the overly permissive public SELECT policy on comments table
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.comments;