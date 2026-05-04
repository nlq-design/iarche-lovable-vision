# Configuration manuelle — Auth Email Hook IArche v5

L'edge function `auth-email-hook` intercepte les emails Supabase Auth (signup, reset password, email change, magic link) et envoie des templates FR brandés IArche v5 via Resend.

Le code est en place. Il reste **5 étapes manuelles** à effectuer côté Dashboard Supabase + Resend.

---

## 1. Générer un secret Webhook

Générer un secret aléatoire fort (ex. via terminal) :

```bash
openssl rand -base64 48
```

Garder cette valeur — elle servira aux étapes 2 et 3.

---

## 2. Ajouter le secret dans Edge Functions Secrets

Dashboard Supabase → **Project Settings → Edge Functions → Secrets** → Add new secret :

- **Name** : `SEND_EMAIL_HOOK_SECRET`
- **Value** : la valeur générée à l'étape 1, **préfixée par `v1,whsec_`**
  - Exemple : `v1,whsec_abc123base64==`

> Le préfixe `v1,whsec_` est requis par le format Standard Webhooks utilisé par Supabase. Le code de l'edge function le retire automatiquement avant vérification.

Vérifier également que `RESEND_API_KEY` est bien présent dans la même liste (déjà configuré pour les autres edge fns email).

---

## 3. Activer le Auth Hook côté Supabase

Dashboard Supabase → **Authentication → Hooks (Beta) → Send Email Hook** :

- **Enable hook** : ON
- **Hook type** : HTTPS
- **URL** : `https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/auth-email-hook`
- **Webhook secret** : la valeur générée à l'étape 1, **préfixée par `v1,whsec_`** (identique à `SEND_EMAIL_HOOK_SECRET`)

Sauvegarder.

À partir de cet instant, **tous** les emails Supabase Auth (signup, recovery, email_change, magiclink) sont routés vers `auth-email-hook` au lieu d'utiliser les templates par défaut EN.

---

## 4. Vérifier le domaine `iarche.fr` chez Resend

L'expéditeur est `IArche <noreply@iarche.fr>`. Resend exige que le domaine soit vérifié.

Dashboard Resend → **Domains** :

- Vérifier que `iarche.fr` apparaît avec le statut **Verified**
- Si non vérifié : ajouter le domaine puis renseigner les enregistrements DNS (SPF, DKIM, MX optionnel pour return-path) chez le registrar du domaine
- Attendre la propagation DNS (souvent < 1h)

Sans cette vérification, Resend retournera une 403 et aucun email ne partira.

---

## 5. Tester

Effectuer un signup test depuis la preview Lovable avec une adresse jetable :

1. Aller sur `/auth` ou `/login` selon le flow public
2. Créer un compte
3. Vérifier la réception de l'email FR brandé IArche dans la boîte du compte test
4. Vérifier les logs côté Supabase : **Edge Functions → auth-email-hook → Logs** doit afficher `success: true`
5. Vérifier la table `email_logs` : une ligne `source_type='auth_hook'`, `status='sent'` doit apparaître

Si l'email arrive en EN par défaut Supabase → le hook n'est pas activé (étape 3).
Si erreur 401 dans les logs → mismatch entre `SEND_EMAIL_HOOK_SECRET` et le secret Dashboard (étape 2 vs étape 3).
Si erreur 500 Resend → domaine non vérifié (étape 4) ou `RESEND_API_KEY` absente.

---

## Récapitulatif technique

| Élément | Valeur |
|---|---|
| Edge function | `supabase/functions/auth-email-hook/index.ts` |
| `verify_jwt` | `false` (signature Standard Webhooks à la place) |
| Secret env required | `SEND_EMAIL_HOOK_SECRET`, `RESEND_API_KEY` |
| Helper templates | `supabase/functions/_shared/emailTemplate.ts` (v5 additif) |
| Logger | `supabase/functions/_shared/emailLogger.ts` (`source_type='auth_hook'`) |
| Expéditeur | `IArche <noreply@iarche.fr>` |
| Actions supportées | `signup`, `recovery`, `email_change`, `email_change_new`, `email_change_current`, `magiclink` |

Aucune modification de `useAuth.tsx` n'est nécessaire — l'interception est transparente côté Supabase Auth.
