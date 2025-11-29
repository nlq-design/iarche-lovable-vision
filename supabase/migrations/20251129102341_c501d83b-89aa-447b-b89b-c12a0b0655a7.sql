-- Fix mutable search_path in logging functions for security hardening
-- This prevents potential SQL injection through search_path manipulation

-- Update log_article_changes function to set fixed search_path
CREATE OR REPLACE FUNCTION public.log_article_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update log_category_changes function to set fixed search_path
CREATE OR REPLACE FUNCTION public.log_category_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update log_tag_changes function to set fixed search_path
CREATE OR REPLACE FUNCTION public.log_tag_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Update log_comment_changes function to set fixed search_path
CREATE OR REPLACE FUNCTION public.log_comment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;