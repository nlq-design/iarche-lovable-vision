---
name: Onboarding Self-serve P5
description: Page /cockpit/onboarding 3 étapes + edge fn create-cockpit-workspace (idempotente, trial 14j)
type: feature
---

## Phase P5 livrée (23/05/2026)

### Flow
1. User signup standard (/auth)
2. Redirect manuel ou lien direct → `/cockpit/onboarding` (route publique mais exige user auth, sinon /auth)
3. Wizard 3 étapes : nom workspace → persona IA (assistant/entreprise/ville/rôle/ton) → confirmation
4. Submit → edge fn `create-cockpit-workspace`

### Edge fn `create-cockpit-workspace`
- verify_jwt par défaut (getClaims en code)
- Zod validation stricte (z.enum, longueurs, language length 2)
- **Idempotente** : si l'user a déjà un workspace owner → retourne `already_exists: true` sans rien créer
- Atomic create : workspace (avec ai_persona + trial 14j) → workspace_members (owner) → user_roles (cockpit_user)
- `subscription_tier='trial'`, `billing_status='trial'`, `trial_ends_at=now+14j`

### Reste à faire (P5-bis, non bloquant)
- Redirect auto post-login : `/auth` → check workspace_members → si vide → `/cockpit/onboarding`
- Étape optionnelle "connecter Google Calendar" dans le wizard
- Onboarding email post-signup (via auth-email-hook custom template)
