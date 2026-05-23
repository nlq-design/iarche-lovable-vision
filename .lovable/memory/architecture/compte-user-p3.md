---
name: Compte User P3 — Activation partenaires orphelins
description: Panneau /admin/users "Partenaires sans compte" réutilise invite-partner (token + email Resend) pour activer les partenaires actifs sans auth.user
type: feature
---

## Phase P3 livrée (23/05/2026)

### Implémentation
- Pas de nouvelle edge fn : réutilisation directe de `invite-partner` (existante, valide super_admin, génère token `partner_invitations`, envoie email Resend via iarche.fr)
- Page `/admin/users` enrichie : section "Partenaires sans compte" listant `partners.user_id IS NULL AND status='active'`
- Champ email éditable par ligne (pré-rempli si `partners.email` existe) + bouton "Inviter"
- À l'invitation : insert dans `partner_invitations` (TTL 7j), email envoyé, panneau rafraîchi

### État audit (23/05/2026)
- 6 partenaires orphelins identifiés (sur 11 total)
- 3 ont un email exploitable : Nicolas LARA QUERALTA, Stéphane OLAIZOLA, audit tt
- 3 sans email : Thomas Anxo, Floriane Garcia, Julien DAMESTOY (nécessitent saisie manuelle ou suppression)

### Décision en attente (P3-bis non livré)
- Espace client visiteur `/mon-espace` : arbitrage business, pas tech. Pas implémenté tant que besoin produit non confirmé.
