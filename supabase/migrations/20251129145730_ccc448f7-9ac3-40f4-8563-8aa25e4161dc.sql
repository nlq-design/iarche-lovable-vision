-- Ajouter 'solution' aux resource_type valides
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_resource_type_check;

ALTER TABLE articles ADD CONSTRAINT articles_resource_type_check 
CHECK (resource_type IN ('actualite', 'article', 'cas-client', 'livre-blanc', 'atelier-webinaire', 'solution'));