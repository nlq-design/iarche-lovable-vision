-- Créer table audit_logs
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'login_failed', 'logout', 'create', 'update', 'delete', 'approve', 'reject', 'publish', 'unpublish')),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('article', 'category', 'tag', 'comment', 'newsletter', 'session')),
  resource_id UUID,
  resource_name TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_audit_logs_user_id ON public.admin_audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON public.admin_audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON public.admin_audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource_id ON public.admin_audit_logs(resource_id);

-- RLS : seuls les admins peuvent lire les logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fonction pour logger automatiquement les modifications d'articles
CREATE OR REPLACE FUNCTION log_article_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, new_data)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'create',
      'article',
      NEW.id,
      NEW.title,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data, new_data)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'update',
      'article',
      NEW.id,
      NEW.title,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'delete',
      'article',
      OLD.id,
      OLD.title,
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur articles
DROP TRIGGER IF EXISTS articles_audit_trigger ON public.articles;
CREATE TRIGGER articles_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.articles
FOR EACH ROW EXECUTE FUNCTION log_article_changes();

-- Fonction pour logger les modifications de catégories
CREATE OR REPLACE FUNCTION log_category_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, new_data)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'create', 'category', NEW.id, NEW.name, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data, new_data)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'update', 'category', NEW.id, NEW.name, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'delete', 'category', OLD.id, OLD.name, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS categories_audit_trigger ON public.categories;
CREATE TRIGGER categories_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION log_category_changes();

-- Fonction pour logger les modifications de tags
CREATE OR REPLACE FUNCTION log_tag_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, new_data)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'create', 'tag', NEW.id, NEW.name, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data, new_data)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'update', 'tag', NEW.id, NEW.name, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'delete', 'tag', OLD.id, OLD.name, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tags_audit_trigger ON public.tags;
CREATE TRIGGER tags_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tags
FOR EACH ROW EXECUTE FUNCTION log_tag_changes();

-- Fonction pour logger les modifications de commentaires
CREATE OR REPLACE FUNCTION log_comment_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.approved != NEW.approved THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data, new_data)
    VALUES (
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      CASE WHEN NEW.approved THEN 'approve' ELSE 'reject' END,
      'comment',
      NEW.id,
      NEW.author_name,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_audit_logs (user_id, user_email, action_type, resource_type, resource_id, resource_name, old_data)
    VALUES (auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'delete', 'comment', OLD.id, OLD.author_name, to_jsonb(OLD));
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS comments_audit_trigger ON public.comments;
CREATE TRIGGER comments_audit_trigger
AFTER UPDATE OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION log_comment_changes();