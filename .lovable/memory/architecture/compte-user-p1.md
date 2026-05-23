---
name: Compte User P1 - profiles enrichi + page Mon compte
description: Phase Compte User P1. Table profiles enrichie (full_name, avatar_url, locale, timezone, notification_prefs jsonb). Trigger handle_new_user auto-crée le profile à signup depuis raw_user_meta_data (Google OAuth full_name/avatar_url, fallback split email). Backfill 5 users existants. Nouvelle page /cockpit/account (CockpitAccount.tsx) avec sections Identité / Langue & fuseau / Notifications / Sécurité MFA / Seuils IA workspace (lecture seule Phase M). Hook useMyAccount centralise profile+MFA+thresholds+signOutEverywhere. Distinct de owner_profiles (identité commerciale workspace-scope dans emails).
type: feature
---

## Compte User P1 — Profil personnel & hub /cockpit/account

### BDD
- `profiles` enrichie : `full_name`, `avatar_url`, `locale` (default `fr`), `timezone` (default `Europe/Paris`), `notification_prefs` jsonb (email, telegram, daily_brief, sentinel_alerts — tous true par défaut).
- Trigger `on_auth_user_created` AFTER INSERT auth.users → `handle_new_user()` SECURITY DEFINER, lit `raw_user_meta_data->>'full_name'|'name'|'avatar_url'` (Google OAuth ready), fallback `split_part(email,'@',1)`.
- Backfill : 5 users existants migrés (idempotent via ON CONFLICT).

### Frontend
- `src/hooks/cockpit/useMyAccount.ts` : profile + mfaFactors (via `supabase.auth.mfa.listFactors()`) + thresholds (workspace_ai_thresholds via RLS member) + mutations update/signOutEverywhere (scope=global).
- `src/pages/cockpit/CockpitAccount.tsx` route `/cockpit/account` (lazy, ProtectedCockpitRoute) : avatar+nom+email vérifié, langue/timezone select, 4 switches notification, badge MFA Active/Inactive, bouton "Déconnecter tous les appareils", lecture seuils IA workspace.
- Sidebar : nouvel item "Mon compte" (UserCircle) après "Paramètres".

### Distinction owner_profiles vs profiles
- `owner_profiles` (1 par workspace) = identité commerciale dans signatures email/RAG `{{owner_context}}` (display_name, role_label, primary_company_id).
- `profiles` (1 par user) = compte personnel (locale, timezone, MFA, prefs notif). Indépendants.

### RLS héritées
- profiles : select_own + admin cockpit, update_own.
- workspace_ai_thresholds : member OR admin (Phase M).
