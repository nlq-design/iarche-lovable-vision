CREATE OR REPLACE FUNCTION public.increment_intent_cache_hit(q text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_query_intent_cache
  SET hit_count = hit_count + 1
  WHERE query_normalized = q;
$$;

REVOKE ALL ON FUNCTION public.increment_intent_cache_hit(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_intent_cache_hit(text) TO service_role, authenticated;