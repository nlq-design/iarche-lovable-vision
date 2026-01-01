-- Ajouter politique RLS pour que les admins classiques puissent voir la mémoire IA
CREATE POLICY "Admins can view all AI memory"
ON public.ai_agent_memory
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Ajouter politique pour que les admins puissent supprimer les entrées mémoire
CREATE POLICY "Admins can delete AI memory"
ON public.ai_agent_memory
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));