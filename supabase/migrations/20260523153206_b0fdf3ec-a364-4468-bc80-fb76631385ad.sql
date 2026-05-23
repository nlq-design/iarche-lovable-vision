
-- =====================================================================
-- Phase Compte User P1 : Enrichissement profiles + auto-création
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Paris',
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT jsonb_build_object(
    'email', true,
    'telegram', true,
    'daily_brief', true,
    'sentinel_alerts', true
  );

-- Trigger auto-création profile à signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill des 5 users existants
INSERT INTO public.profiles (user_id, full_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- updated_at trigger (au cas où il n'existerait pas déjà)
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
