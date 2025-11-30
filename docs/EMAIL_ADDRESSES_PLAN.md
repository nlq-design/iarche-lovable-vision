# Plan des adresses email IArche

## 📧 Adresses email à créer sur `iarche.fr`

### Emails de service (utilisés par les edge functions)

| Adresse | Usage | Edge Function | Destinataires |
|---------|-------|---------------|---------------|
| `notifications@iarche.fr` | Notifications de nouveaux leads | `send-lead-notification` | `nlq@iarche.fr` |
| `notifications@iarche.fr` | Notifications nouveaux commentaires | `notify-new-comment` | `nlq@iarche.fr` |
| `newsletter@iarche.fr` | Envoi des newsletters | `send-newsletter` | Abonnés newsletter |
| `security@iarche.fr` | Alertes de sécurité | `send-security-alert` | `nlq@iarche.fr` |
| `analytics@iarche.fr` | Alertes analytics CTA | `check-cta-conversion` | `nlq@iarche.fr` |
| `performance@iarche.fr` | Alertes performance | `check-performance-threshold` | `nlq@iarche.fr` |

### Emails principaux (utilisés manuellement)

| Adresse | Usage | Créer boîte mail |
|---------|-------|------------------|
| `contact@iarche.fr` | Contact général | ✅ Oui (redirection → `nlq@iarche.fr`) |
| `nlq@iarche.fr` | Email personnel Nicolas | ✅ Oui (boîte principale) |
| `support@iarche.fr` | Support clients | ⚠️ Optionnel (redirection → `nlq@iarche.fr`) |
| `bonjour@iarche.fr` | Email convivial alternatif | ⚠️ Optionnel |

---

## 🎯 Recommandation simplifiée

### Configuration minimale (démarrage)

**Tu n'as besoin de créer QUE 2 boîtes mail réelles** :

1. **`nlq@iarche.fr`** → Boîte principale (tu la consultes)
2. **Utiliser Resend uniquement pour l'envoi** → Les adresses `notifications@`, `security@`, etc. n'ont pas besoin de boîtes mail réelles, elles servent juste d'expéditeur

**Redirections à configurer** :
- `contact@iarche.fr` → Redirige vers `nlq@iarche.fr`
- `support@iarche.fr` → Redirige vers `nlq@iarche.fr` (si créé)

### Configuration avancée (futur)

Quand le volume augmente, tu peux créer des boîtes séparées :
- `security@iarche.fr` → Boîte dédiée aux alertes sécurité
- `analytics@iarche.fr` → Boîte dédiée aux rapports analytics

---

## ⚙️ Configuration Resend

### Après vérification du domaine

**Les emails de service** (`notifications@`, `security@`, etc.) :
- ✅ Pas besoin de créer de vraies boîtes mail
- ✅ Servent uniquement d'expéditeur via Resend
- ✅ Resend gère l'envoi automatiquement

**Important** :
- Resend ne gère PAS la **réception** des emails
- Pour recevoir des emails sur `contact@iarche.fr`, configure une boîte mail chez ton hébergeur (OVH, Gandi, etc.) ou utilise Google Workspace / Microsoft 365

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

## ✅ Prochaines étapes

1. **Maintenant** : Configure les DNS sur ton registrar
2. **Attends 2-48h** : Vérification du domaine sur Resend
3. **Une fois vérifié** : Demande la mise à jour des 6 edge functions
4. **Test final** : Déclenche un lead pour vérifier l'envoi

---

**Créé le** : 2025-11-30
