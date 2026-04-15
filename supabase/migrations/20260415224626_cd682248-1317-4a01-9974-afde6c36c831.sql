ALTER TABLE public.forms DISABLE TRIGGER trg_restrict_forms_counter_updates;

UPDATE public.forms SET is_active = false, updated_at = now() WHERE id = '6c2b3a02-0a77-4116-9e06-78f0b4a80c7e';

ALTER TABLE public.forms ENABLE TRIGGER trg_restrict_forms_counter_updates;