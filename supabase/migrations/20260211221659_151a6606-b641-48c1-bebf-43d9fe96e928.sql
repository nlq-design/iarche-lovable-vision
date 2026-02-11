
-- Create action_proposals table for Propose → Validate → Execute flow
CREATE TABLE public.action_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'proposed', -- proposed, validated, executed, rejected
  action_type TEXT NOT NULL, -- send_email, create_task, update_opportunity, etc.
  action_label TEXT NOT NULL, -- Human-readable label for the user
  action_payload JSONB NOT NULL, -- Full action data (to, subject, body for email; title, description for task, etc.)
  ai_reasoning TEXT, -- Why the AI proposed this action
  validation_notes TEXT, -- User notes when validating/rejecting
  executed_at TIMESTAMP WITH TIME ZONE,
  executed_result JSONB, -- Result of the executed action (e.g., email_id, task_id)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_proposals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their workspace action proposals"
ON public.action_proposals
FOR SELECT
USING (auth.uid()::UUID = user_id OR workspace_id IN (
  SELECT id FROM public.workspaces WHERE id = workspace_id
));

CREATE POLICY "Users can create action proposals in their workspace"
ON public.action_proposals
FOR INSERT
WITH CHECK (workspace_id IN (
  SELECT id FROM public.workspaces WHERE id = workspace_id
));

CREATE POLICY "Users can update action proposals in their workspace"
ON public.action_proposals
FOR UPDATE
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE id = workspace_id
));

-- Create trigger for updated_at
CREATE TRIGGER update_action_proposals_updated_at
BEFORE UPDATE ON public.action_proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_action_proposals_workspace_status ON public.action_proposals(workspace_id, status);
CREATE INDEX idx_action_proposals_user_created ON public.action_proposals(user_id, created_at DESC);
