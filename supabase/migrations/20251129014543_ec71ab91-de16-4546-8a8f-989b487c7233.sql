-- Create newsletters table for newsletter management
CREATE TABLE public.newsletters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  author_id UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- Admins can manage all newsletters
CREATE POLICY "Admins can manage newsletters"
ON public.newsletters
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all newsletters
CREATE POLICY "Admins can view all newsletters"
ON public.newsletters
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_newsletters_updated_at
BEFORE UPDATE ON public.newsletters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();