-- Create an optimized RPC function to get distinct departments with leads
-- Uses LEFT(postal_code, 2) for metropolitan France and LEFT(postal_code, 3) for DOM-TOM
CREATE OR REPLACE FUNCTION public.get_viviers_departments()
RETURNS TABLE(department_code TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT 
    CASE 
      -- DOM-TOM departments have 3-digit codes (971, 972, 973, 974, 976)
      WHEN LEFT(postal_code, 3) IN ('971', '972', '973', '974', '976') THEN LEFT(postal_code, 3)
      -- Corsica has special codes (2A, 2B) - postal codes start with 20
      WHEN LEFT(postal_code, 2) = '20' THEN 
        CASE 
          WHEN CAST(postal_code AS INTEGER) BETWEEN 20000 AND 20190 THEN '2A'
          ELSE '2B'
        END
      -- Metropolitan France uses 2-digit codes
      ELSE LEFT(postal_code, 2)
    END AS department_code
  FROM viviers
  WHERE postal_code IS NOT NULL 
    AND postal_code != ''
    AND LENGTH(postal_code) >= 2
  ORDER BY department_code;
$$;