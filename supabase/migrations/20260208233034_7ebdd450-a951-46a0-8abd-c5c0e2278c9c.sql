
-- AI Feedback table for thumbs up/down on AI suggestions
CREATE TABLE public.ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
  user_id UUID,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  source_function TEXT NOT NULL,
  mode TEXT,
  rating SMALLINT NOT NULL CHECK (rating IN (-1, 1)),
  comment TEXT,
  ai_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON public.ai_feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own feedback"
  ON public.ai_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_ai_feedback_source ON public.ai_feedback(source_function, mode);
CREATE INDEX idx_ai_feedback_rating ON public.ai_feedback(rating, created_at);
CREATE INDEX idx_ai_feedback_workspace ON public.ai_feedback(workspace_id);
