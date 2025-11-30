-- Synchroniser les messages existants depuis contacts vers leads
UPDATE public.leads 
SET message = contacts.message
FROM public.contacts
WHERE leads.source = 'contact' 
  AND leads.email = contacts.email
  AND DATE(leads.created_at) = DATE(contacts.created_at)
  AND leads.message IS NULL;