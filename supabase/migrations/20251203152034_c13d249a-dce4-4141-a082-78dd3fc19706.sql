-- Table des types de rendez-vous
CREATE TABLE public.booking_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#1A2B4A',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des créneaux disponibles (plages horaires)
CREATE TABLE public.booking_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_type_id UUID REFERENCES public.booking_types(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des réservations
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_type_id UUID NOT NULL REFERENCES public.booking_types(id) ON DELETE RESTRICT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  message TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  google_event_id TEXT,
  google_meet_link TEXT,
  notes TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_booking_type ON public.bookings(booking_type_id);
CREATE INDEX idx_booking_availability_type ON public.booking_availability(booking_type_id);

-- Enable RLS
ALTER TABLE public.booking_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Policies for booking_types
CREATE POLICY "Public can view active booking types" ON public.booking_types
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage booking types" ON public.booking_types
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for booking_availability
CREATE POLICY "Public can view active availability" ON public.booking_availability
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage availability" ON public.booking_availability
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for bookings
CREATE POLICY "Public can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage bookings" ON public.bookings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_booking_types_updated_at
  BEFORE UPDATE ON public.booking_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les types de RDV existants (remplaçant Cal.com)
INSERT INTO public.booking_types (name, slug, description, duration_minutes) VALUES
  ('Audit IA', 'audit-conseil', 'Premier échange pour évaluer vos besoins en IA', 30),
  ('Chatbot RAG Avancé', 'chatbot-rag-avance', 'Présentation de notre solution chatbot IA', 15),
  ('Présentation ERP Avocat', 'presentation-erp-avocat-booste-a-l-ia', 'Découvrez notre ERP boosté à l''IA pour avocats', 15),
  ('Présentation Team 5 Connect', 'presentation-team-5-connect', 'Simplifiez la gestion RH de vos équipes terrain', 15),
  ('Présentation Datalia', 'presentation-datalia', 'Solution de data visualisation et reporting IA', 15),
  ('Présentation Collaboria', 'presentation-collaboria', 'Plateforme collaborative IA pour les équipes', 15);

-- Insérer les disponibilités par défaut (Lundi-Vendredi 9h-18h)
INSERT INTO public.booking_availability (booking_type_id, day_of_week, start_time, end_time)
SELECT bt.id, dow.day, '09:00'::TIME, '18:00'::TIME
FROM public.booking_types bt
CROSS JOIN (SELECT generate_series(1, 5) AS day) dow;