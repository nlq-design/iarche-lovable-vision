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

### Où ajouter les DNS ?

Connecte-toi à ton registrar (OVH, Gandi, Cloudflare, etc.) et va dans la section **DNS/Zone DNS**.

### Enregistrements à ajouter

Resend va te fournir **exactement ces enregistrements** (les valeurs peuvent varier) :

#### A) SPF Record (TXT)
**Objectif** : Autorise Resend à envoyer des emails pour ton domaine

```
Type: TXT
Name: @ (ou iarche.fr)
Value: v=spf1 include:amazonses.com ~all
TTL: 3600
```

#### B) DKIM Records (3× TXT)
**Objectif** : Signatures cryptographiques pour authentifier tes emails

Resend te donnera **3 enregistrements DKIM** à ajouter :

```
Type: TXT
Name: resend._domainkey.iarche.fr
Value: [longue chaîne fournie par Resend - commençant par p=MII...]
TTL: 3600

Type: TXT
Name: resend2._domainkey.iarche.fr
Value: [longue chaîne fournie par Resend]
TTL: 3600

Type: TXT
Name: resend3._domainkey.iarche.fr
Value: [longue chaîne fournie par Resend]
TTL: 3600
```

⚠️ **IMPORTANT** : Copie-colle exactement les valeurs fournies par Resend (elles font ~300 caractères).

#### C) DMARC Record (TXT) - Optionnel mais recommandé
**Objectif** : Politique de gestion des emails non authentifiés

```
Type: TXT
Name: _dmarc.iarche.fr (ou _dmarc)
Value: v=DMARC1; p=quarantine; rua=mailto:nlq@iarche.fr; pct=100; adkim=s; aspf=s
TTL: 3600
```

**Explication des paramètres DMARC** :
- `p=quarantine` : Met en quarantaine les emails suspects (tu peux utiliser `p=reject` pour plus de sécurité)
- `rua=mailto:nlq@iarche.fr` : Adresse pour recevoir les rapports d'authentification
- `pct=100` : Applique la politique à 100% des emails
- `adkim=s` : DKIM strict
- `aspf=s` : SPF strict

---

## Étape 3️⃣ : Vérifier la propagation DNS

### Délai de propagation
- **Minimum** : 15 minutes
- **Maximum** : 48 heures (généralement < 2 heures)

### Outils de vérification

1. **Vérifier SPF** :
   ```
   https://mxtoolbox.com/spf.aspx?domain=iarche.fr
   ```

2. **Vérifier DKIM** :
   ```
   https://mxtoolbox.com/dkim.aspx?domain=iarche.fr&selector=resend
   ```

3. **Vérifier DMARC** :
   ```
   https://mxtoolbox.com/dmarc.aspx?domain=iarche.fr
   ```

4. **Commandes DNS** (depuis un terminal) :
   ```bash
   # Vérifier SPF
   dig TXT iarche.fr +short
   
   # Vérifier DKIM
   dig TXT resend._domainkey.iarche.fr +short
   
   # Vérifier DMARC
   dig TXT _dmarc.iarche.fr +short
   ```

### Statut sur Resend

Sur [resend.com/domains](https://resend.com/domains), le statut de ton domaine doit passer de :
- ❌ **Pending** → ✅ **Verified**

---

## Étape 4️⃣ : Mettre à jour les Edge Functions

Une fois le domaine **vérifié** ✅, les 6 edge functions suivantes doivent être mises à jour :

### Fonctions à modifier

| Edge Function | Adresse actuelle | Nouvelle adresse |
|---|---|---|
| `send-lead-notification` | `onboarding@resend.dev` | `notifications@iarche.fr` |
| `notify-new-comment` | `onboarding@resend.dev` | `notifications@iarche.fr` |
| `send-newsletter` | `onboarding@resend.dev` | `newsletter@iarche.fr` |
| `send-security-alert` | `onboarding@resend.dev` | `security@iarche.fr` |
| `check-cta-conversion` | `onboarding@resend.dev` | `analytics@iarche.fr` |
| `check-performance-threshold` | `onboarding@resend.dev` | `performance@iarche.fr` |

### Commande à lancer

**⚠️ NE PAS EXÉCUTER AVANT QUE LE DOMAINE SOIT VÉRIFIÉ ✅**

Une fois vérifié, demande à Lovable de mettre à jour toutes les fonctions avec :

```
"Mettre à jour les 6 edge functions pour utiliser les emails @iarche.fr maintenant que le domaine est vérifié"
```

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
