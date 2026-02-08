-- 1. Add 'harvested' to the valid status values
ALTER TABLE public.tasks DROP CONSTRAINT tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status = ANY (ARRAY['pending','in_progress','completed','cancelled','snoozed','harvested']));

-- 2. Add 'proposal' to valid task_type values (used by harvest new_task generation)
ALTER TABLE public.tasks DROP CONSTRAINT tasks_task_type_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_task_type_check 
  CHECK (task_type = ANY (ARRAY['follow_up','call','email','meeting','document','review','proposal','other']));

-- 3. Deduplicate: keep only the NEWEST task per (title, entity_id) combo for AI tasks
-- First, mark duplicates for deletion (keep the one with latest created_at)
DELETE FROM tasks 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY title, entity_id ORDER BY created_at DESC) as rn
    FROM tasks 
    WHERE ai_generated = true AND status = 'pending'
  ) ranked 
  WHERE rn > 1
);

-- 4. Mark already-harvested tasks (from activity_log records) as 'harvested'
UPDATE tasks 
SET status = 'harvested' 
WHERE id IN (
  SELECT DISTINCT task_id 
  FROM activity_log 
  WHERE activity_type = 'ai_harvest' 
  AND task_id IS NOT NULL
) AND status = 'pending';