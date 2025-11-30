-- #3: Foreign Keys avec CASCADE et #5: Validation + Index

-- 1. Ajouter ON DELETE CASCADE sur les FK existantes
ALTER TABLE article_views DROP CONSTRAINT IF EXISTS article_views_article_id_fkey;
ALTER TABLE article_views 
  ADD CONSTRAINT article_views_article_id_fkey 
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_article_id_fkey;
ALTER TABLE comments 
  ADD CONSTRAINT comments_article_id_fkey 
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE article_categories DROP CONSTRAINT IF EXISTS article_categories_article_id_fkey;
ALTER TABLE article_categories 
  ADD CONSTRAINT article_categories_article_id_fkey 
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE article_tags DROP CONSTRAINT IF EXISTS article_tags_article_id_fkey;
ALTER TABLE article_tags 
  ADD CONSTRAINT article_tags_article_id_fkey 
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE faqs DROP CONSTRAINT IF EXISTS faqs_article_id_fkey;
ALTER TABLE faqs 
  ADD CONSTRAINT faqs_article_id_fkey 
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE atelier_inscriptions DROP CONSTRAINT IF EXISTS atelier_inscriptions_atelier_id_fkey;
ALTER TABLE atelier_inscriptions 
  ADD CONSTRAINT atelier_inscriptions_atelier_id_fkey 
  FOREIGN KEY (atelier_id) REFERENCES articles(id) ON DELETE CASCADE;

ALTER TABLE article_versions DROP CONSTRAINT IF EXISTS article_versions_article_id_fkey;
ALTER TABLE article_versions 
  ADD CONSTRAINT article_versions_article_id_fkey 
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE;

-- 2. Contrainte unique sur slugs
CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_unique_idx ON articles(slug);

-- 3. Index de performance manquants
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_resource_type ON articles(resource_type);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_article_views_viewed_at ON article_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(approved);
CREATE INDEX IF NOT EXISTS idx_cta_clicks_clicked_at ON cta_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_subscribed_at ON newsletter_subscribers(subscribed_at);

-- 4. Index composites pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_articles_type_published ON articles(resource_type, published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_status_type ON articles(status, resource_type);
CREATE INDEX IF NOT EXISTS idx_leads_source_created ON leads(source, created_at DESC);

-- 5. Fonction de nettoyage des orphelins
CREATE OR REPLACE FUNCTION cleanup_orphan_data()
RETURNS TABLE(
  orphan_article_views INTEGER,
  orphan_comments INTEGER,
  orphan_atelier_inscriptions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_views INTEGER;
  deleted_comments INTEGER;
  deleted_inscriptions INTEGER;
BEGIN
  -- Nettoyer article_views sans article valide
  DELETE FROM article_views 
  WHERE article_id NOT IN (SELECT id FROM articles);
  GET DIAGNOSTICS deleted_views = ROW_COUNT;
  
  -- Nettoyer comments sans article valide
  DELETE FROM comments 
  WHERE article_id NOT IN (SELECT id FROM articles);
  GET DIAGNOSTICS deleted_comments = ROW_COUNT;
  
  -- Nettoyer atelier_inscriptions sans atelier valide
  DELETE FROM atelier_inscriptions 
  WHERE atelier_id NOT IN (SELECT id FROM articles WHERE resource_type = 'atelier-webinaire');
  GET DIAGNOSTICS deleted_inscriptions = ROW_COUNT;
  
  RETURN QUERY SELECT deleted_views, deleted_comments, deleted_inscriptions;
END;
$$;

-- 6. Fonction de validation resource_type
CREATE OR REPLACE FUNCTION validate_resource_type()
RETURNS TABLE(
  article_id UUID,
  title TEXT,
  resource_type TEXT,
  issue TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.resource_type,
    CASE 
      WHEN a.resource_type NOT IN ('actualite', 'article', 'cas-client', 'livre-blanc', 'atelier-webinaire', 'solution') 
        THEN 'Invalid resource_type'
      WHEN a.resource_type = 'atelier-webinaire' AND a.event_date IS NULL 
        THEN 'Missing event_date for atelier'
      WHEN a.resource_type = 'livre-blanc' AND a.file_url IS NULL 
        THEN 'Missing file_url for livre-blanc'
      ELSE 'OK'
    END as issue
  FROM articles a
  WHERE a.resource_type NOT IN ('actualite', 'article', 'cas-client', 'livre-blanc', 'atelier-webinaire', 'solution')
     OR (a.resource_type = 'atelier-webinaire' AND a.event_date IS NULL)
     OR (a.resource_type = 'livre-blanc' AND a.file_url IS NULL);
END;
$$;