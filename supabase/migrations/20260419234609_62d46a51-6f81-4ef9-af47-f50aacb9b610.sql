-- QW#6 - Add missing index on activity_log.entity_id
-- Forward migration

CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON public.activity_log (entity_id);

-- Rollback: DROP INDEX IF EXISTS idx_activity_log_entity_id;