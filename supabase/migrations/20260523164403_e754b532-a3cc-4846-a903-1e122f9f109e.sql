
-- Politique SELECT super_admin direct (sécurité défensive en plus du RPC)
DROP POLICY IF EXISTS "subscriptions_select_super_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_select_super_admin"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Révoquer l'exécution publique/anon des RPC de suivi cross-workspace
REVOKE EXECUTE ON FUNCTION public.get_cockpit_saas_kpis() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_cockpit_saas_subscriptions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_cockpit_saas_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cockpit_saas_subscriptions() TO authenticated;
