ALTER TABLE public.forms DISABLE TRIGGER trg_restrict_forms_counter_updates;

UPDATE public.forms 
SET article_id = '69dc6219-2af3-46b0-8045-6959f299b899', updated_at = now() 
WHERE id = '7a72875b-618c-4d06-addf-b14d03d1f991';

ALTER TABLE public.forms ENABLE TRIGGER trg_restrict_forms_counter_updates;