-- Fix count_atelier_inscriptions function to set search_path (security best practice)
CREATE OR REPLACE FUNCTION public.count_atelier_inscriptions(atelier_uuid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path = 'public'
AS $function$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM atelier_inscriptions
  WHERE atelier_id = atelier_uuid;
  
  RETURN count_result;
END;
$function$;