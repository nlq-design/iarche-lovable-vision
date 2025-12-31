-- 1. Add transcription_date to voice_transcriptions (if not exists)
ALTER TABLE public.voice_transcriptions 
ADD COLUMN IF NOT EXISTS transcription_date date DEFAULT CURRENT_DATE;

-- Add index for historical queries
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_date 
ON public.voice_transcriptions(transcription_date DESC);

-- 2. Create keyword_aliases table for improved matching
CREATE TABLE IF NOT EXISTS public.keyword_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  alias text NOT NULL,
  context_type text NOT NULL DEFAULT 'solution',
  phonetic_key text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT keyword_aliases_context_type_check CHECK (context_type IN ('solution', 'client', 'concurrent', 'outil', 'service', 'autre')),
  CONSTRAINT keyword_aliases_unique UNIQUE (canonical_name, alias)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_keyword_aliases_alias ON public.keyword_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_keyword_aliases_phonetic ON public.keyword_aliases(phonetic_key) WHERE phonetic_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_keyword_aliases_context ON public.keyword_aliases(context_type);

-- Enable RLS
ALTER TABLE public.keyword_aliases ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop if exist first)
DROP POLICY IF EXISTS "keyword_aliases_admin_all" ON public.keyword_aliases;
DROP POLICY IF EXISTS "keyword_aliases_cockpit_read" ON public.keyword_aliases;

CREATE POLICY "keyword_aliases_admin_all" ON public.keyword_aliases
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "keyword_aliases_cockpit_read" ON public.keyword_aliases
  FOR SELECT USING (has_role(auth.uid(), 'cockpit_user'::app_role) OR has_role(auth.uid(), 'cockpit_admin'::app_role));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_keyword_aliases_updated_at ON public.keyword_aliases;
CREATE TRIGGER set_keyword_aliases_updated_at
  BEFORE UPDATE ON public.keyword_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Function to generate phonetic key (simple Soundex-like for French)
CREATE OR REPLACE FUNCTION public.generate_phonetic_key(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $function$
DECLARE
  result text;
  normalized text;
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN NULL;
  END IF;
  
  normalized := UPPER(input_text);
  normalized := TRANSLATE(normalized, 
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ',
    'AAAAAACEEEEIIIINOOOOOUUUUYY'
  );
  
  result := normalized;
  result := REGEXP_REPLACE(result, '[AEIOUYHW]', '', 'g');
  result := REGEXP_REPLACE(result, 'PH', 'F', 'g');
  result := REGEXP_REPLACE(result, 'QU', 'K', 'g');
  result := REGEXP_REPLACE(result, 'CH', 'S', 'g');
  result := REGEXP_REPLACE(result, 'SC', 'S', 'g');
  result := REGEXP_REPLACE(result, 'CC', 'K', 'g');
  result := REGEXP_REPLACE(result, 'CK', 'K', 'g');
  result := REGEXP_REPLACE(result, 'C', 'K', 'g');
  result := REGEXP_REPLACE(result, 'X', 'KS', 'g');
  result := REGEXP_REPLACE(result, 'Z', 'S', 'g');
  result := REGEXP_REPLACE(result, '(.)\1+', '\1', 'g');
  result := LEFT(normalized, 1) || COALESCE(result, '');
  
  RETURN LEFT(result, 8);
END;
$function$;

-- 4. Trigger to auto-generate phonetic key
CREATE OR REPLACE FUNCTION public.set_phonetic_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.phonetic_key := public.generate_phonetic_key(NEW.alias);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS set_keyword_aliases_phonetic_key ON public.keyword_aliases;
CREATE TRIGGER set_keyword_aliases_phonetic_key
  BEFORE INSERT OR UPDATE OF alias ON public.keyword_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_phonetic_key();

-- 5. Seed initial aliases
INSERT INTO public.keyword_aliases (canonical_name, alias, context_type) VALUES
  ('Datalia', 'Atalia', 'solution'),
  ('Datalia', 'Data Lia', 'solution'),
  ('Datalia', 'Datelia', 'solution'),
  ('Collaboria', 'Colaboria', 'solution'),
  ('Collaboria', 'Collab Oria', 'solution'),
  ('Dialogue Plus', 'Dialog Plus', 'solution'),
  ('Dialogue Plus', 'Dialogue +', 'solution'),
  ('Projetia', 'Projet IA', 'solution'),
  ('Projetia', 'Project IA', 'solution'),
  ('IArche', 'I Arche', 'solution'),
  ('IArche', 'Iarche', 'solution'),
  ('IArche', 'I-Arche', 'solution')
ON CONFLICT (canonical_name, alias) DO NOTHING;