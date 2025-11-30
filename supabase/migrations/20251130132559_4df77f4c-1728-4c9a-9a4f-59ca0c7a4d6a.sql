-- Ajouter un champ pour contrôler la visibilité du nombre de participants
ALTER TABLE public.articles 
ADD COLUMN show_participants_count boolean DEFAULT true;