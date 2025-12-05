-- Supprimer la politique qui expose les leads au public
DROP POLICY IF EXISTS "Public peut lire lead par email" ON public.leads;