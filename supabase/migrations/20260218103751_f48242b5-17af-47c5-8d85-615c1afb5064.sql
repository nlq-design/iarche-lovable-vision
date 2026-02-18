
-- Table for persistent alert dismissals (7-day TTL)
CREATE TABLE IF NOT EXISTS public.alert_dismissals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(user_id, alert_id)
);

-- Fast lookup index
CREATE INDEX idx_alert_dismissals_user ON public.alert_dismissals(user_id, expires_at);

-- RLS
ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own dismissals"
  ON public.alert_dismissals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dismissals"
  ON public.alert_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dismissals"
  ON public.alert_dismissals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dismissals"
  ON public.alert_dismissals FOR DELETE
  USING (auth.uid() = user_id);
