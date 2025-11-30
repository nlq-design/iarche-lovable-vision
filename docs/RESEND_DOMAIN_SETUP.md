# Configuration Domaine Resend pour IArche

## 📋 Vue d'ensemble

Ce guide explique comment configurer le domaine `iarche.fr` sur Resend pour envoyer des emails professionnels depuis `notifications@iarche.fr`, `security@iarche.fr`, etc.

---

## Étape 1️⃣ : Ajouter le domaine sur Resend

1. **Connexion** : [resend.com/domains](https://resend.com/domains)
2. **Add Domain** : Clique sur "Add Domain"
3. **Nom du domaine** : Entre `iarche.fr`
4. **Région** : Choisis la région (recommandé : `eu-west-1` pour l'Europe)

---

## Étape 2️⃣ : Configurer les enregistrements DNS

### 📋 Enregistrements DNS exacts fournis par Resend

Voici les **enregistrements DNS réels** affichés dans ton dashboard Resend pour `iarche.fr` :

#### 1. DKIM (Signature des emails)

```
Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCzO/L2XYt4HR9DsJQNuHGsmrJtygK9fbV26WhQvb+mYSm7UTfbQzCTGf7fg23VU1do0DC1/GrOLcAyBfi5ZoFG3pM7jd7kpE/dMZbx6SUUAZiLp5MwNOy5JA0JLQSGo6UYgXdJGfnZVcj06415dQDXqYtWw8wcOok4QnQYUykimwIDAQAB
TTL: Auto
```

#### 2. SPF - MX Record (Autorisation d'envoi)

```
Type: MX
Name: send
Value: feedback-smtp.eu-west-1.amazonses.com
TTL: Auto
Priority: 10
```

#### 3. SPF - TXT Record (Politique SPF)

```
Type: TXT
Name: send
Value: v=spf1 include:amazonses.com ~all
TTL: Auto
```

#### 4. MX Record (Réception - OPTIONNEL)

```
Type: MX
Name: @
Value: inbound-smtp.eu-west-1.amazonaws.com
TTL: Auto
Priority: 10
```

⚠️ **Note importante** : L'enregistrement MX sur `@` est nécessaire **UNIQUEMENT** si tu veux recevoir des emails via Resend. Pour IArche, tu peux **l'ignorer** car tu recevras les emails via ta boîte mail classique `nlq@iarche.fr`.

---

### 🔧 Où ajouter ces enregistrements ?

Connecte-toi à l'interface de ton **registrar de domaine** (là où tu as acheté `iarche.fr`) :

- **OVH** : [Manager OVH](https://www.ovh.com/manager/) → Nom de domaine → iarche.fr → Zone DNS
- **Gandi** : [Gandi Admin](https://admin.gandi.net/) → Domaines → iarche.fr → Enregistrements DNS
- **Namecheap** : [Namecheap Dashboard](https://ap.www.namecheap.com/) → Domain List → iarche.fr → Advanced DNS
- **GoDaddy** : [GoDaddy DNS Management](https://dcc.godaddy.com/) → Domains → iarche.fr → DNS

### 📝 Instructions étape par étape :

1. **Accède à la zone DNS** de ton domaine `iarche.fr`
2. **Ajoute les 3 enregistrements obligatoires** :
   - ✅ 1 TXT pour DKIM (`resend._domainkey`)
   - ✅ 1 MX pour SPF (`send`)
   - ✅ 1 TXT pour SPF (`send`)
3. **Ignore l'enregistrement MX sur `@`** (réception email non nécessaire)
4. **Sauvegarde les modifications**
5. **Attends la propagation DNS** (généralement 1-2h, jusqu'à 48h maximum)

---

## Étape 3️⃣ : Vérifier la propagation DNS

### ⏱️ Délai de propagation
- **Minimum** : 15-30 minutes
- **Généralement** : 1-2 heures
- **Maximum** : 48 heures

### 🔍 Outils de vérification

1. **DNSChecker.org** (recommandé) :
   ```
   https://dnschecker.org
   ```
   Entre `resend._domainkey.iarche.fr` et sélectionne "TXT"

2. **MXToolbox** :
   ```
   https://mxtoolbox.com/SuperTool.aspx
   ```
   Entre `iarche.fr` et teste les différents enregistrements

3. **Commandes terminal** (pour utilisateurs avancés) :
   ```bash
   # Vérifier DKIM
   dig TXT resend._domainkey.iarche.fr +short
   
   # Vérifier SPF TXT
   dig TXT send.iarche.fr +short
   
   # Vérifier SPF MX
   dig MX send.iarche.fr +short
   ```

### ✅ Statut sur Resend

Sur [resend.com/domains](https://resend.com/domains), vérifie que :
- Le domaine `iarche.fr` affiche **"Verified"** ✅
- Les 3 enregistrements DNS affichent des **coches vertes** ✅

---

## Étape 4️⃣ : Edge Functions (DÉJÀ CONFIGURÉES ✅)

### ✅ Configuration terminée le 2025-11-30

Les 6 edge functions sont **déjà mises à jour** pour utiliser les adresses `@iarche.fr` :

| Edge Function | Adresse email | Champ `reply_to` |
|---|---|---|
| `send-lead-notification` | `notifications@iarche.fr` | ✅ `nlq@iarche.fr` |
| `notify-new-comment` | `notifications@iarche.fr` | ✅ `nlq@iarche.fr` |
| `send-newsletter` | `newsletter@iarche.fr` | ✅ `nlq@iarche.fr` |
| `send-security-alert` | `security@iarche.fr` | ✅ `nlq@iarche.fr` |
| `check-cta-conversion` | `analytics@iarche.fr` | ✅ `nlq@iarche.fr` |
| `check-performance-threshold` | `performance@iarche.fr` | ✅ `nlq@iarche.fr` |

**Aucune action supplémentaire requise** - les emails s'enverront automatiquement depuis ces adresses dès que le domaine sera vérifié sur Resend.

---

## Étape 5️⃣ : Tester l'envoi d'emails

### Test manuel depuis Resend

1. Va sur [resend.com/emails](https://resend.com/emails)
2. Clique sur "Send Test Email"
3. Utilise `notifications@iarche.fr` comme expéditeur
4. Envoie un email à `nlq@iarche.fr`
5. Vérifie la réception

### Test depuis l'application

1. Déclenche un nouveau lead (formulaire contact/newsletter/livre-blanc)
2. Vérifie la réception de l'email à `nlq@iarche.fr`
3. Vérifie que l'expéditeur est bien `notifications@iarche.fr`

---

## 🛠 Troubleshooting

### ❌ Domaine non vérifié après 48h

**Causes possibles** :
1. Enregistrements DNS mal configurés
2. Conflit avec d'autres enregistrements SPF/DKIM existants
3. TTL trop élevé (> 3600)

**Solutions** :
- Vérifie les enregistrements avec MXToolbox
- Supprime les anciens enregistrements SPF/DKIM si présents
- Attends 24h supplémentaires si TTL > 3600

### ❌ Emails rejetés/en spam

**Causes possibles** :
1. DMARC mal configuré
2. Contenu des emails suspect (trop de liens, pièces jointes)
3. Réputation de l'IP Amazon SES faible

**Solutions** :
- Configure DMARC avec `p=quarantine` d'abord, puis `p=reject` après tests
- Demande aux destinataires de marquer comme "Non spam"
- Attends quelques jours pour construire la réputation

### ❌ Erreur "Domain not verified" dans les logs

**Cause** : Le domaine n'est pas encore vérifié sur Resend

**Solution** :
- Vérifie le statut sur [resend.com/domains](https://resend.com/domains)
- Attends la vérification complète (statut ✅)
- Ne mets à jour les edge functions qu'après vérification

---

## 📊 Monitoring & Analytics

### Dashboard Resend

Consulte régulièrement [resend.com/emails](https://resend.com/emails) pour :
- Taux de délivrabilité
- Taux d'ouverture
- Bounces (emails rejetés)
- Plaintes spam

### Rapports DMARC

Les rapports DMARC seront envoyés à `nlq@iarche.fr` quotidiennement. Analyse-les pour :
- Détecter des tentatives d'usurpation de domaine
- Vérifier l'authentification SPF/DKIM
- Ajuster la politique DMARC si nécessaire

---

## ✅ Checklist finale

- [ ] Domaine ajouté sur Resend
- [ ] Enregistrements SPF ajoutés au DNS
- [ ] Enregistrements DKIM (×3) ajoutés au DNS
- [ ] Enregistrement DMARC ajouté au DNS
- [ ] Domaine vérifié ✅ sur Resend
- [ ] Edge functions mises à jour
- [ ] Email de test envoyé et reçu
- [ ] Déclenchement d'un lead réel testé

---

## 📞 Support

- **Resend Support** : [resend.com/support](https://resend.com/support)
- **Documentation Resend** : [resend.com/docs](https://resend.com/docs)
- **Lovable Support** : Si problème avec les edge functions

---

**Dernière mise à jour** : 2025-11-30
