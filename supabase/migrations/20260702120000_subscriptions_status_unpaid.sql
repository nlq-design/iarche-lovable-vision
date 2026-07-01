-- Stripe envoie le statut 'unpaid' (paiement échoué non-annulé) — absent du CHECK
-- → l'upsert du webhook échouait sur cet état. On l'ajoute.
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status = any (array['trialing','active','past_due','canceled','incomplete','incomplete_expired','paused','unpaid']));
