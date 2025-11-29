# Configuration finale de la sécurité IArche

## Vue d'ensemble

Ce document décrit la configuration finale des systèmes de sécurité pour IArche, incluant la protection contre les tentatives de connexion, l'authentification à deux facteurs, et les backups automatiques.

---

## 1. Protection contre les tentatives de connexion échouées

### Fonctionnement

Le système détecte et bloque automatiquement les comptes après **5 tentatives de connexion échouées** en l'espace de **15 minutes**. Le compte est alors verrouillé pour **30 minutes**.

### Tables créées

- **`login_attempts`** : Enregistre toutes les tentatives de connexion (réussies et échouées)
- **`account_locks`** : Gère les comptes temporairement verrouillés

### Edge Functions

- **`check-login-attempt`** : Vérifie et enregistre chaque tentative de connexion
  - Compte les échecs récents
  - Verrouille le compte si nécessaire
  - Envoie une alerte email aux admins

### Alertes automatiques

Lorsqu'un compte est verrouillé, tous les administrateurs reçoivent un email avec :
- L'email du compte verrouillé
- Le nombre de tentatives échouées
- L'adresse IP d'origine
- La durée du verrouillage

### Nettoyage automatique

Les anciennes tentatives (> 30 jours) sont nettoyées automatiquement via la fonction `cleanup_login_attempts()`.

---

## 2. Authentification à deux facteurs (2FA/MFA)

### Activation du MFA dans Lovable Cloud

Pour activer le Multi-Factor Authentication (2FA avec TOTP) dans votre projet :

1. **Ouvrir le Backend Lovable Cloud**
   - Cliquez sur l'onglet "Cloud" en haut de l'interface
   - Ou cliquez sur le bouton "View Backend" dans l'admin

2. **Accéder aux paramètres d'authentification**
   - Dans le menu latéral, cliquez sur **"Users"**
   - Puis cliquez sur **"Auth Settings"**

3. **Activer le MFA**
   - Faites défiler jusqu'à la section **"Multi-Factor Authentication (MFA)"**
   - Activez l'option **"Enable MFA"**
   - Sauvegardez les modifications

### Configuration du 2FA pour les admins

Une fois le MFA activé dans les paramètres :

1. **Accéder aux paramètres de sécurité**
   - Connectez-vous en tant qu'admin
   - Allez dans **Admin → Sécurité → Paramètres de sécurité**
   - Cliquez sur l'onglet **"Authentification 2FA"**

2. **Activer le 2FA**
   - Cliquez sur **"Activer le 2FA"**
   - Un QR code sera généré

3. **Scanner le QR code**
   - Ouvrez votre application d'authentification (Google Authenticator, Authy, Microsoft Authenticator, etc.)
   - Scannez le QR code affiché
   - Ou entrez manuellement la clé secrète si nécessaire

4. **Vérifier et activer**
   - Entrez le code à 6 chiffres affiché dans votre application
   - Cliquez sur **"Vérifier et activer"**

5. **Sauvegarder les codes de récupération**
   - 10 codes de récupération uniques sont générés
   - **IMPORTANT** : Téléchargez-les et conservez-les en lieu sûr
   - Ces codes permettent d'accéder à votre compte si vous perdez l'accès à votre application d'authentification
   - Chaque code ne peut être utilisé qu'une seule fois

### Connexion avec 2FA

Une fois le 2FA activé :

1. Entrez votre email et mot de passe comme d'habitude
2. Si les identifiants sont corrects, vous serez invité à entrer le code TOTP
3. Ouvrez votre application d'authentification
4. Entrez le code à 6 chiffres (il change toutes les 30 secondes)
5. Vous êtes connecté

### Désactiver le 2FA

En cas de besoin (non recommandé) :

1. Allez dans **Admin → Sécurité → Paramètres de sécurité**
2. Onglet **"Authentification 2FA"**
3. Cliquez sur **"Désactiver le 2FA"**
4. Confirmez (une alerte de sécurité indiquera que cela réduit la sécurité du compte)

### Applications d'authentification recommandées

- **Google Authenticator** (iOS, Android) - Gratuit, simple
- **Authy** (iOS, Android, Desktop) - Gratuit, synchronisation cloud
- **Microsoft Authenticator** (iOS, Android) - Gratuit, intégration Microsoft
- **1Password** (Multiplateforme) - Payant, gestionnaire de mots de passe intégré
- **Bitwarden** (Multiplateforme) - Gratuit/Payant, open source

---

## 3. Gestion des sessions actives

### Fonctionnalités

L'interface **"Paramètres de sécurité"** permet de :

- Visualiser toutes les sessions actives
- Voir les détails de chaque session (appareil, IP, dernière activité)
- Identifier la session actuelle
- Révoquer individuellement des sessions
- Révoquer toutes les autres sessions en un clic

### Utilisation

1. Allez dans **Admin → Sécurité → Paramètres de sécurité**
2. Onglet **"Sessions actives"**
3. Consultez la liste de vos sessions
4. Cliquez sur **"Révoquer"** pour déconnecter un appareil spécifique
5. Ou cliquez sur **"Révoquer toutes les autres sessions"** pour garder uniquement la session actuelle

---

## 4. Backups automatiques de la base de données

### Système de backup

Le système de backup permet de :
- Créer des backups manuels à tout moment
- Programmer des backups automatiques (via pg_cron)
- Recevoir des notifications email à chaque backup réussi
- Consulter l'historique des backups
- Voir les statistiques de chaque backup

### Tables sauvegardées

Les backups incluent toutes les tables importantes :
- Articles, catégories, tags
- Commentaires et abonnés newsletter
- Logs d'audit et tentatives de connexion
- Comptes verrouillés
- Rôles utilisateurs
- Et plus encore...

### Créer un backup manuel

1. Allez dans **Admin → Sécurité → Backups**
2. Cliquez sur **"Créer un backup"**
3. Le backup démarre immédiatement
4. Vous recevrez un email quand il sera terminé
5. Le backup apparaît dans l'historique avec :
   - Nombre d'enregistrements sauvegardés
   - Taille du fichier
   - Durée de l'opération
   - Tables incluses

### Configuration des backups automatiques (pg_cron)

Pour programmer des backups automatiques quotidiens :

#### Étape 1 : Activer pg_cron et pg_net

Ces extensions sont nécessaires pour les tâches planifiées.

**Via Lovable Cloud UI :**
1. Ouvrez le Backend (Cloud)
2. Allez dans **Database → Extensions**
3. Activez **pg_cron** et **pg_net**

#### Étape 2 : Créer le cron job

Exécutez ce SQL dans **Database → SQL Editor** :

```sql
-- Backup quotidien à 2h du matin
SELECT cron.schedule(
  'daily-database-backup',
  '0 2 * * *',  -- Tous les jours à 2h00
  $$
  SELECT net.http_post(
    url:='https://mgjyhlyrwnnioctkbdkk.supabase.co/functions/v1/create-database-backup',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nanlobHlyd25uaW9jdGtiZGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzIwNTQsImV4cCI6MjA3OTkwODA1NH0.r8IpfwFxVNOpNWS3A5p4CbINUbtvG3AyPgtWwK6vAhQ"}'::jsonb,
    body:='{"backup_type": "scheduled"}'::jsonb
  ) as request_id;
  $$
);
```

#### Vérifier que le cron job fonctionne

```sql
-- Lister tous les cron jobs
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

#### Supprimer un cron job

Si nécessaire :

```sql
SELECT cron.unschedule('daily-database-backup');
```

#### Autres fréquences possibles

```sql
-- Toutes les heures
'0 * * * *'

-- Tous les jours à minuit
'0 0 * * *'

-- Tous les dimanches à 3h
'0 3 * * 0'

-- Toutes les 6 heures
'0 */6 * * *'

-- Deux fois par jour (à 6h et 18h)
'0 6,18 * * *'
```

### Notifications email

À chaque backup réussi, tous les administrateurs reçoivent un email avec :
- Type de backup (manuel/automatique)
- Nombre total d'enregistrements
- Taille du backup
- Nombre de tables sauvegardées
- Horodatage de fin

### Consultation de l'historique

L'interface **Admin → Sécurité → Backups** affiche :
- Les 20 derniers backups
- Statut de chaque backup (terminé, échoué, en cours)
- Statistiques détaillées
- Messages d'erreur si échec

---

## 5. Dashboard de sécurité

Le dashboard de sécurité (`/admin/security-dashboard`) centralise :

- **Métriques en temps réel**
  - Nombre d'actions dans les logs d'audit
  - Actions récentes (dernières 24h)
  - Utilisateurs actifs
  - Suppressions effectuées

- **Graphiques**
  - Distribution des actions par type
  - Activité par type de ressource

- **Détection d'anomalies IA**
  - Analyse automatique des logs d'audit
  - Identification de comportements suspects
  - Recommandations de sécurité

---

## 6. Résumé des fonctionnalités de sécurité

### ✅ Protection anti-brute force
- Verrouillage automatique après 5 échecs
- Alertes email aux admins
- Nettoyage automatique des anciennes tentatives

### ✅ Authentification à deux facteurs (2FA)
- Support TOTP avec QR code
- Codes de récupération
- Gestion des appareils de confiance
- Interface complète d'activation/désactivation

### ✅ Gestion des sessions
- Visualisation de toutes les sessions actives
- Révocation individuelle ou en masse
- Détails par session (appareil, IP, localisation)

### ✅ Backups automatiques
- Backups manuels à la demande
- Planification automatique (pg_cron)
- Notifications email
- Historique complet
- Statistiques détaillées

### ✅ Monitoring de sécurité
- Dashboard centralisé
- Logs d'audit complets
- Détection d'anomalies par IA
- Alertes automatiques

---

## 7. Recommandations finales

1. **Activez le MFA pour tous les comptes admins** - C'est la mesure de sécurité la plus importante
2. **Configurez les backups automatiques** - Protégez vos données contre les pertes
3. **Consultez régulièrement le dashboard de sécurité** - Restez informé de l'activité
4. **Vérifiez les sessions actives régulièrement** - Détectez les accès non autorisés
5. **Sauvegardez vos codes de récupération 2FA** - En lieu sûr et hors ligne
6. **Testez la restauration de backups** - Assurez-vous que vos backups fonctionnent
7. **Activez les notifications email** - Restez alerté des événements critiques

---

## Support

Pour toute question ou problème de sécurité :
- Consultez les logs d'audit dans l'interface admin
- Vérifiez le dashboard de sécurité
- Contactez le support technique si nécessaire

**Version :** 1.0  
**Date :** Novembre 2025  
**Statut :** Production-ready
