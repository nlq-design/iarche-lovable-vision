-- Ajouter un champ resource_type à la table articles
ALTER TABLE public.articles 
ADD COLUMN resource_type text NOT NULL DEFAULT 'actualite'
CHECK (resource_type IN ('actualite', 'article', 'cas-client', 'livre-blanc', 'atelier-webinaire'));

-- Créer un index pour améliorer les performances des requêtes filtrées par type
CREATE INDEX idx_articles_resource_type ON public.articles(resource_type);

-- Commentaire pour documentation
COMMENT ON COLUMN public.articles.resource_type IS 'Type de ressource: actualite, article, cas-client, livre-blanc, atelier-webinaire';