-- ============================================================================
-- TELEGRAM STATS TABLE - For dashboard metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_name TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'voice', 'audio', 'document', 'image', 'command')),
  command_name TEXT,
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'timeout')),
  error_message TEXT,
  ai_tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX idx_telegram_stats_created_at ON public.telegram_stats(created_at DESC);
CREATE INDEX idx_telegram_stats_status ON public.telegram_stats(status);
CREATE INDEX idx_telegram_stats_message_type ON public.telegram_stats(message_type);

-- Enable RLS but allow service role full access
ALTER TABLE public.telegram_stats ENABLE ROW LEVEL SECURITY;

-- Only allow authenticated admins to read stats
CREATE POLICY "Admins can view telegram stats" 
ON public.telegram_stats 
FOR SELECT 
TO authenticated
USING (true);

-- Service role can insert (from edge function)
CREATE POLICY "Service role can insert telegram stats" 
ON public.telegram_stats 
FOR INSERT 
WITH CHECK (true);

-- ============================================================================
-- TELEGRAM REMINDERS TABLE - For /rappel command
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.telegram_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  user_name TEXT,
  reminder_text TEXT NOT NULL,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled'))
);

-- Index for pending reminders query
CREATE INDEX idx_telegram_reminders_pending ON public.telegram_reminders(remind_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.telegram_reminders ENABLE ROW LEVEL SECURITY;

-- Admins can view
CREATE POLICY "Admins can view telegram reminders" 
ON public.telegram_reminders 
FOR SELECT 
TO authenticated
USING (true);

-- Service role can manage (from edge function)
CREATE POLICY "Service role can manage telegram reminders" 
ON public.telegram_reminders 
FOR ALL 
WITH CHECK (true);