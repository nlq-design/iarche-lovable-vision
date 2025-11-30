
-- Retirer le DEFAULT now() de la colonne created_at pour permettre les dates personnalisées
ALTER TABLE public.articles ALTER COLUMN created_at DROP DEFAULT;

-- Commentaire : Cela permet aux utilisateurs de choisir une date de création personnalisée
-- lors de la création d'articles dans l'admin. Si aucune date n'est fournie, 
-- le code frontend passera explicitement la date du jour.
