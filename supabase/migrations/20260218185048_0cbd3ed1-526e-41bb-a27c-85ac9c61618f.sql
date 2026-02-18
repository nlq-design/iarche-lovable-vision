
ALTER TABLE public.action_proposals ADD COLUMN IF NOT EXISTS auto_execute BOOLEAN DEFAULT false;
ALTER TABLE public.action_proposals ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'orchestrator';
