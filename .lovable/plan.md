

# Fix : Compteur inscrits + Emails de notification

## Diagnostic

### Problème 1 : Compteur "0/30 inscrits"
Le compteur utilise `count_atelier_inscriptions` qui compte les lignes dans la table `atelier_inscriptions`. Or le formulaire de la page événement (`EventLandingForm.tsx`) insère UNIQUEMENT dans `form_responses` — il n'insère **jamais** dans `atelier_inscriptions`. Les 2 réponses existantes sont dans `form_responses` mais `atelier_inscriptions` est vide.

Le formulaire classique `AtelierInscriptionForm.tsx` (utilisé sur la page article standard) fait correctement les deux : `upsert_lead` → `atelier_inscriptions.insert`. Mais `EventLandingForm` ne fait que `form_responses.insert` + `upsert_lead` basique.

### Problème 2 : Emails non envoyés
`EventLandingForm.tsx` n'appelle **aucune** edge function de notification après soumission. Pas de `send-form-notification`, pas de `send-atelier-confirmation`, pas de `send-lead-notification`. L'ancien appel à `send-form-notification` dans `FormPublic.tsx` a été supprimé lors du fix précédent, et `EventLandingForm` n'a jamais eu ces appels.

## Actions

### 1. `EventLandingForm.tsx` — Ajouter insertion `atelier_inscriptions` + emails

Après l'insertion dans `form_responses` et le `upsert_lead`, ajouter :

1. **Récupérer le `lead_id`** depuis `upsert_lead` (la RPC retourne l'ID)
2. **Insérer dans `atelier_inscriptions`** avec `atelier_id: articleId` et `lead_id`
3. **Appeler `send-form-notification`** pour notifier l'admin (nlq) et envoyer la confirmation au participant
4. **Appeler `send-atelier-confirmation`** pour l'email de confirmation structuré avec détails de l'événement

Le flux final sera aligné avec `AtelierInscriptionForm.tsx` :
- `form_responses.insert` → réponse brute
- `upsert_lead` → lead CRM
- `atelier_inscriptions.insert` → compteur
- `send-form-notification` → email admin + confirmation
- `send-atelier-confirmation` → email participant avec détails événement

### 2. Enrichir les données du `upsert_lead`

Actuellement l'appel `upsert_lead` dans `EventLandingForm` est minimal (email + name). Il faut passer aussi `p_company`, `p_phone`, `p_source_id` comme le fait `AtelierInscriptionForm`.

## Fichier impacté

| Fichier | Modification |
|---------|-------------|
| `src/components/events/EventLandingForm.tsx` | Ajouter insertion `atelier_inscriptions`, enrichir `upsert_lead`, appeler edge functions de notification |

Zero migration SQL. Les tables et fonctions existent déjà.

