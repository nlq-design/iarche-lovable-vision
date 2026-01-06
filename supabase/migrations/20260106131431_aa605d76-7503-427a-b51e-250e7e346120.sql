-- Fix search_path for notify_new_lead_telegram function
CREATE OR REPLACE FUNCTION public.notify_new_lead_telegram()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search_path for notify_new_booking_telegram function
CREATE OR REPLACE FUNCTION public.notify_new_booking_telegram()
RETURNS TRIGGER AS $$
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;