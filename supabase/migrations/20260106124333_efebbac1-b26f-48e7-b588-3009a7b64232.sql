-- Table des préférences de notifications Telegram
CREATE TABLE IF NOT EXISTS public.telegram_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  telegram_chat_id TEXT NOT NULL,
  
  -- Préférences par type de notification
  notify_new_leads BOOLEAN DEFAULT true,
  notify_task_reminders BOOLEAN DEFAULT true,
  notify_new_bookings BOOLEAN DEFAULT true,
  notify_morning_briefing BOOLEAN DEFAULT true,
  
  -- Configuration briefing
  briefing_time TIME DEFAULT '08:00',
  briefing_timezone TEXT DEFAULT 'Europe/Paris',
  
  -- Délai rappel tâches (en minutes avant échéance)
  task_reminder_minutes INTEGER DEFAULT 60,
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_telegram_notif_prefs_chat_id ON telegram_notification_preferences(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_notif_prefs_user ON telegram_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_notif_prefs_active ON telegram_notification_preferences(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.telegram_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own preferences"
  ON telegram_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON telegram_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON telegram_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON telegram_notification_preferences FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Table pour tracker les notifications envoyées (éviter doublons)
CREATE TABLE IF NOT EXISTS public.telegram_sent_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  message_id TEXT
);

-- Index pour vérifier les doublons
CREATE INDEX IF NOT EXISTS idx_telegram_sent_notif_lookup 
  ON telegram_sent_notifications(chat_id, notification_type, entity_id);

-- Cleanup automatique des anciennes notifications (> 7 jours)
CREATE INDEX IF NOT EXISTS idx_telegram_sent_notif_cleanup 
  ON telegram_sent_notifications(sent_at);

-- Enable RLS
ALTER TABLE public.telegram_sent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access for sent notifications"
  ON telegram_sent_notifications FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');