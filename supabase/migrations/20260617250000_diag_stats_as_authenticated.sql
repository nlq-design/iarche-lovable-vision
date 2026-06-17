-- (no-op) Diagnostic effectué hors migration : get_viviers_stats renvoie 166814
-- en contexte authenticated (rôle authenticated + jwt.claims = Nick). Base OK.
-- Le « 0 » du dashboard viviers = cache navigateur (PWA / service worker).
select 1;
