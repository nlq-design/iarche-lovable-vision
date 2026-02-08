
-- Fix edge_function_model_config: restrict to actual admins
DROP POLICY IF EXISTS "Admins can view edge function configs" ON public.edge_function_model_config;
DROP POLICY IF EXISTS "Admins can insert edge function configs" ON public.edge_function_model_config;
DROP POLICY IF EXISTS "Admins can update edge function configs" ON public.edge_function_model_config;
DROP POLICY IF EXISTS "Admins can delete edge function configs" ON public.edge_function_model_config;

CREATE POLICY "Admins can view edge function configs"
ON public.edge_function_model_config FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "Admins can insert edge function configs"
ON public.edge_function_model_config FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "Admins can update edge function configs"
ON public.edge_function_model_config FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cockpit_admin'));

CREATE POLICY "Admins can delete edge function configs"
ON public.edge_function_model_config FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'cockpit_admin'));
