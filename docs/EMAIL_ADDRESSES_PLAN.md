# Plan des adresses email IArche

## ✅ Configuration Active depuis le 2025-11-30

Le domaine **iarche.fr** est vérifié sur Resend et les 6 edge functions utilisent maintenant les adresses @iarche.fr avec `reply_to: 'nlq@iarche.fr'` configuré.

## 📧 Adresses email @iarche.fr (ACTIVES)

### Emails de service (utilisés par les edge functions)

| Adresse | Usage | Edge Function | Destinataires | Statut |
|---------|-------|---------------|---------------|--------|
| `notifications@iarche.fr` | Notifications de nouveaux leads | `send-lead-notification` | `nlq@iarche.fr` | ✅ Actif |
| `notifications@iarche.fr` | Notifications nouveaux commentaires | `notify-new-comment` | `nlq@iarche.fr` | ✅ Actif |
| `newsletter@iarche.fr` | Envoi des newsletters | `send-newsletter` | Abonnés newsletter | ✅ Actif |
| `security@iarche.fr` | Alertes de sécurité | `send-security-alert` | `nlq@iarche.fr` | ✅ Actif |
| `analytics@iarche.fr` | Alertes analytics CTA | `check-cta-conversion` | `nlq@iarche.fr` | ✅ Actif |
| `performance@iarche.fr` | Alertes performance | `check-performance-threshold` | `nlq@iarche.fr` | ✅ Actif |

### Emails principaux (utilisés manuellement)

| Adresse | Usage | Créer boîte mail |
|---------|-------|------------------|
| `contact@iarche.fr` | Contact général | ✅ Oui (redirection → `nlq@iarche.fr`) |
| `nlq@iarche.fr` | Email personnel Nicolas | ✅ Oui (boîte principale) |
| `support@iarche.fr` | Support clients | ⚠️ Optionnel (redirection → `nlq@iarche.fr`) |
| `bonjour@iarche.fr` | Email convivial alternatif | ⚠️ Optionnel |

---

## 🎯 Configuration Actuelle

### ✅ Configuration réalisée (2025-11-30)

1. **Domaine vérifié sur Resend** : `iarche.fr` ✅
2. **DNS configurés** : SPF, DKIM (3 enregistrements) ✅
3. **6 Edge Functions migrées** : Toutes utilisent maintenant `@iarche.fr` ✅
4. **Reply-To configuré** : Tous les emails permettent de répondre à `nlq@iarche.fr` ✅

### 📬 Boîtes mail nécessaires

**Tu n'as besoin de créer QUE 2 boîtes mail réelles** :

1. **`nlq@iarche.fr`** → Boîte principale (tu la consultes)
2. **Utiliser Resend uniquement pour l'envoi** → Les adresses `notifications@`, `security@`, etc. n'ont pas besoin de boîtes mail réelles, elles servent juste d'expéditeur

**Redirections recommandées** :
- `contact@iarche.fr` → Redirige vers `nlq@iarche.fr`
- `support@iarche.fr` → Redirige vers `nlq@iarche.fr` (optionnel)

### Configuration avancée (futur)

Quand le volume augmente, tu peux créer des boîtes séparées :
- `security@iarche.fr` → Boîte dédiée aux alertes sécurité
- `analytics@iarche.fr` → Boîte dédiée aux rapports analytics

---

## ⚙️ Configuration Resend (TERMINÉE)

### ✅ Domaine vérifié et actif

**Les emails de service** (`notifications@`, `security@`, etc.) :
- ✅ Configurés et opérationnels depuis le 2025-11-30
- ✅ Pas besoin de créer de vraies boîtes mail pour ces adresses
- ✅ Servent uniquement d'expéditeur via Resend
- ✅ Tous les emails incluent `reply_to: 'nlq@iarche.fr'` pour les réponses

**Important** :
- Resend ne gère PAS la **réception** des emails
- Pour recevoir des emails sur `contact@iarche.fr`, configure une boîte mail chez ton hébergeur (OVH, Gandi, etc.) ou utilise Google Workspace / Microsoft 365
- Les destinataires peuvent répondre directement aux emails, les réponses arrivent à `nlq@iarche.fr`

---

## 🔄 Workflow simplifié

```
┌─────────────────────────────────────────────┐
│ 1. Utilisateur soumet formulaire contact   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 2. Edge function send-lead-notification     │
│    déclenche l'envoi via Resend             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 3. Email envoyé de:                         │
│    notifications@iarche.fr                  │
│    vers: nlq@iarche.fr                      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 4. Tu reçois l'email dans ta boîte          │
│    nlq@iarche.fr                            │
└─────────────────────────────────────────────┘
```

---

## 📝 Notes importantes

### SPF et adresses multiples

Avec un seul enregistrement SPF sur `iarche.fr`, **toutes les adresses** (@iarche.fr) peuvent envoyer via Resend :
- `notifications@iarche.fr` ✅
- `security@iarche.fr` ✅
- `newsletter@iarche.fr` ✅
- `contact@iarche.fr` ✅
- Toute autre adresse @iarche.fr ✅

### DKIM et signatures

Les 3 enregistrements DKIM signent tous les emails sortants du domaine, quelle que soit l'adresse expéditeur.

### Adresses de réponse

Si tu veux que les destinataires puissent répondre :
- Ajoute un champ `reply_to` dans les edge functions
- Exemple : `reply_to: 'nlq@iarche.fr'`
- Les réponses iront directement dans ta boîte principale

---

## ✅ Statut de la configuration

| Étape | Statut | Date |
|-------|--------|------|
| Configuration DNS sur registrar | ✅ Terminé | 2025-11-30 |
| Vérification du domaine sur Resend | ✅ Vérifié | 2025-11-30 |
| Mise à jour des 6 edge functions | ✅ Terminé | 2025-11-30 |
| Ajout du champ `reply_to` | ✅ Terminé | 2025-11-30 |
| Tests d'envoi | ⏳ À faire | - |

### 🧪 Tests recommandés

Pour vérifier le bon fonctionnement :
1. Tester l'envoi d'un lead via formulaire contact
2. Créer un commentaire en attente de modération
3. Vérifier la réception des emails à `nlq@iarche.fr`
4. Tester la fonction "Répondre" dans les emails reçus

---

**Créé le** : 2025-11-30  
**Mis à jour le** : 2025-11-30 (Configuration terminée)
