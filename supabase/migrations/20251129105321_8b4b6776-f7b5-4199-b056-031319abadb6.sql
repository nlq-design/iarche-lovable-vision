-- Créer une table pour le rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour optimiser les requêtes de rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint ON public.rate_limit_requests(ip_address, endpoint, window_start);

-- Fonction pour nettoyer les anciennes entrées (plus de 1 heure)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_requests
  WHERE window_start < now() - INTERVAL '1 hour';
END;
$$;

-- Pas de RLS sur cette table car elle est gérée uniquement par les edge functions
ALTER TABLE public.rate_limit_requests ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux edge functions d'insérer et lire
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limit_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
