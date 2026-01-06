-- Trigger pour notifier les nouveaux leads
CREATE OR REPLACE FUNCTION notify_new_lead_telegram()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the proactive notification edge function via pg_net
  PERFORM net.http_post(
    url := 'https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/telegram-proactive-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nanlobHlyd25uaW9jdGtiZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzIwNTQsImV4cCI6MjA3OTkwODA1NH0.r8IpfwFxVNOpNWS3A5p4CbINUbtvG3AyPgtWwK6vAhQ'
    ),
    body := jsonb_build_object(
      'type', 'new_lead',
      'entity_id', NEW.id::text
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_lead_telegram ON leads;
CREATE TRIGGER trigger_notify_new_lead_telegram
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead_telegram();

-- Trigger pour notifier les nouvelles réservations
CREATE OR REPLACE FUNCTION notify_new_booking_telegram()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for confirmed bookings
  IF NEW.status = 'confirmed' THEN
    PERFORM net.http_post(
      url := 'https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/telegram-proactive-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nanlobHlyd25uaW9jdGtiZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzIwNTQsImV4cCI6MjA3OTkwODA1NH0.r8IpfwFxVNOpNWS3A5p4CbINUbtvG3AyPgtWwK6vAhQ'
      ),
      body := jsonb_build_object(
        'type', 'new_booking',
        'entity_id', NEW.id::text
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_booking_telegram ON bookings;
CREATE TRIGGER trigger_notify_new_booking_telegram
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_booking_telegram();

-- Cron job pour les rappels de tâches (toutes les 15 minutes)
SELECT cron.schedule(
  'telegram-task-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/telegram-proactive-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nanlobHlyd25uaW9jdGtiZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzIwNTQsImV4cCI6MjA3OTkwODA1NH0.r8IpfwFxVNOpNWS3A5p4CbINUbtvG3AyPgtWwK6vAhQ"}'::jsonb,
    body := '{"action": "check_task_reminders"}'::jsonb
  );
  $$
);

-- Cron job pour le briefing matinal (toutes les 5 minutes entre 7h et 9h)
SELECT cron.schedule(
  'telegram-morning-briefing',
  '*/5 7-9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/telegram-proactive-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nanlobHlyd25uaW9jdGtiZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzIwNTQsImV4cCI6MjA3OTkwODA1NH0.r8IpfwFxVNOpNWS3A5p4CbINUbtvG3AyPgtWwK6vAhQ"}'::jsonb,
    body := '{"action": "check_morning_briefing"}'::jsonb
  );
  $$
);