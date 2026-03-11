
-- FK on opportunities already exists, skip it
-- Add FK on projects (use IF NOT EXISTS pattern via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_assigned_to_fkey' 
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE public.projects 
    ADD CONSTRAINT projects_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_assigned_to_fkey' 
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES auth.users(id);
  END IF;
END $$;

-- Trigger: sync workspaces.owner_id when owner_profile is created/updated
CREATE OR REPLACE FUNCTION public.sync_workspace_owner_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.workspaces 
  SET owner_id = NEW.id
  WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists from partial previous run, then create
DROP TRIGGER IF EXISTS trigger_sync_workspace_owner ON public.owner_profile;
CREATE TRIGGER trigger_sync_workspace_owner
AFTER INSERT OR UPDATE ON public.owner_profile
FOR EACH ROW EXECUTE FUNCTION public.sync_workspace_owner_id();

-- Backfill existing workspaces
UPDATE public.workspaces w
SET owner_id = op.id
FROM public.owner_profile op
WHERE op.workspace_id = w.id
AND w.owner_id IS NULL;
