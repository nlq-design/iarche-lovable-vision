# Configuration Google Tag Manager (GTM)

## ✅ GTM est déjà installé

Ton ID GTM `GTM-NTWDKNLK` est installé dans le site. Le conteneur est actif.

## 🎯 Prochaine étape : Configurer Google Analytics 4 dans GTM

### 1. Aller sur Google Tag Manager
👉 [https://tagmanager.google.com](https://tagmanager.google.com)

### 2. Créer un tag Google Analytics 4

1. **Créer un tag** :
   - Clique sur "Tags" → "Nouveau"
   - Nom : `GA4 - Configuration`
   - Type de tag : `Google Analytics: GA4 Configuration`

2. **Configurer le tag** :
   - **Measurement ID** : Ton ID GA4 (format `G-XXXXXXXXXX`)
   - Si tu n'as pas encore de GA4, crée-le sur [analytics.google.com](https://analytics.google.com)

3. **Déclencheur** :
   - Sélectionner : `All Pages` (toutes les pages)

4. **Enregistrer et publier** :
   - Sauvegarder le tag
   - Cliquer sur "Submit" (publier)
   - Ajouter un nom de version : "Installation GA4"

### 3. Vérifier que ça marche

1. Ouvre ton site : [https://iarche.fr](https://iarche.fr)
2. Active le **mode Aperçu** dans GTM (bouton "Preview")
3. Navigue sur ton site
4. Dans GTM, vérifie que le tag GA4 se déclenche

OU

1. Ouvre Google Analytics → Rapports → Temps réel
2. Navigue sur ton site
3. Vérifie les visiteurs en temps réel

---

## 📊 Événements à configurer dans GTM (optionnel)

### Tracking des formulaires

Tu peux tracker automatiquement les soumissions de formulaires :

1. **Variables** → Activer les variables intégrées :
   - `Form ID`
   - `Form Classes`
   - `Form Text`

2. **Déclencheurs** → Nouveau :
   - Type : `Form Submission`
   - Nom : `Form - Newsletter`
   - Condition : `Form ID` contient `newsletter`

3. **Tags** → Nouveau :
   - Type : `Google Analytics: GA4 Event`
   - Nom : `GA4 Event - Newsletter Signup`
   - Event Name : `newsletter_signup`
   - Déclencheur : `Form - Newsletter`

Répéter pour le formulaire de contact.

---

## 🎯 Autres outils à ajouter dans GTM

### Facebook Pixel
1. Tags → Nouveau
2. Type : `Custom HTML`
3. Coller le code Facebook Pixel
4. Déclencheur : All Pages

### LinkedIn Insight Tag
1. Tags → Nouveau
2. Type : `LinkedIn Insight Tag`
3. Partner ID : Ton ID LinkedIn
4. Déclencheur : All Pages

### Hotjar
1. Tags → Nouveau
2. Type : `Custom HTML`
3. Coller le script Hotjar
4. Déclencheur : All Pages

---

## 📚 Ressources

- [Documentation GTM](https://support.google.com/tagmanager)
- [Configuration GA4 dans GTM](https://support.google.com/analytics/answer/9744165)
- [GTM Academy (gratuit)](https://analytics.google.com/analytics/academy/)

---

## 🔒 Confidentialité (RGPD)

✅ **Ton site mentionne déjà GTM et GA4** dans `/confidentialite`

Pour être 100% conforme RGPD :
- Ajouter un banner de consentement cookies (optionnel mais recommandé)
- Bloquer GTM jusqu'au consentement utilisateur (selon ton approche RGPD)

---

## 🆘 Support

Besoin d'aide ? Contacte-moi ou consulte la doc officielle Google Tag Manager.
