## Diagnostic Zoom

**Verdict : ECART confirmé côté intégration Zoom, très probablement hors UI.** Le module n’est pas cassé par la page Transcriptions elle-même : l’appel frontend part bien vers `zoom-import-recordings`, la fonction répond `200`, mais elle renvoie une liste vide avec un warning de droits Zoom.

### Preuves relevées

- **UI** : `src/components/cockpit/transcriptions/ZoomImportModal.tsx`
  - ligne 41 : appel `supabase.functions.invoke('zoom-import-recordings', { body: { action: 'list' } })`
  - ligne 47-48 : si `data.recordings.length === 0`, toast générique `Aucun enregistrement Zoom trouvé sur les 30 derniers jours`
  - problème UX : le warning backend `data.warning` n’est pas affiché, donc l’erreur réelle est masquée.

- **Backend manuel** : `supabase/functions/zoom-import-recordings/index.ts`
  - lignes 138-144 : récupère un token Zoom puis liste les enregistrements sur 30 jours.
  - lignes 47-89 : essaie 3 stratégies :
    1. `/users/me/recordings`
    2. `/users` puis `/users/{id}/recordings`
    3. `/accounts/{accountId}/recordings`
  - lignes 91-102 : si les scopes Zoom sont manquants, retourne volontairement `recordings: []` + `warning` au lieu d’un 500.

- **Réponse réelle de la fonction testée maintenant** :
  ```json
  {
    "recordings": [],
    "total": 0,
    "warning": "Zoom scopes manquants. Ajoutez un des scopes suivants dans votre app Zoom : cloud_recording:read:list_user_recordings, cloud_recording:read:list_user_recordings:admin, ou cloud_recording:read:list_account_recordings:master."
  }
  ```

- **Logs backend récents** :
  ```text
  Invalid access token, does not contain scopes:[cloud_recording:read:list_user_recordings, cloud_recording:read:list_user_recordings:admin]
  /users/me/recordings failed (400), trying user-list approach
  Zoom scopes manquants...
  ```

- **Secrets Zoom présents** :
  - `ZOOM_ACCOUNT_ID`
  - `ZOOM_CLIENT_ID`
  - `ZOOM_CLIENT_SECRET`
  - `ZOOM_WEBHOOK_SECRET_TOKEN`

- **Config backend** : `supabase/config.toml`
  - `zoom-recording-webhook` est bien déclaré `verify_jwt = false`.
  - `zoom-import-recordings` n’a pas de bloc explicite ; il reste invocable avec session utilisateur via `supabase.functions.invoke`, et l’appel réel répond bien `200`, donc le blocage n’est pas JWT.

- **Données internes** :
  - des bookings Zoom existent en base, donc la création de réunions Zoom a déjà fonctionné.
  - aucune transcription `source = 'zoom_recording'` trouvée actuellement, donc aucun import/webhook récent n’a produit de transcription visible.

## Cause probable

Le token Server-to-Server OAuth Zoom est bien généré, mais l’app Zoom configurée ne porte plus les scopes Cloud Recording nécessaires, ou Zoom a changé/invalidé l’autorisation effective après modification/reconnexion de l’app.

Ce n’est pas un problème de date ni de page UI : la fonction interroge bien la fenêtre `2026-04-10 → 2026-05-10`, mais Zoom refuse les endpoints d’enregistrements faute de scope.

## Plan de correction proposé

### 1. Correction UX immédiate du modal Zoom

Dans `ZoomImportModal.tsx` :

- afficher `data.warning` en toast warning au lieu du toast générique “Aucun enregistrement...” quand le backend signale un problème de scopes ;
- afficher dans le modal un état explicite : “Accès aux enregistrements Zoom non autorisé” ;
- conserver le toast “Aucun enregistrement trouvé” seulement quand il n’y a pas de warning backend.

Objectif : ne plus masquer une erreur de configuration Zoom comme une absence d’enregistrement.

### 2. Durcir la fonction `zoom-import-recordings`

Dans `supabase/functions/zoom-import-recordings/index.ts` :

- ajouter dans la réponse un champ structuré, par exemple :
  ```json
  {
    "recordings": [],
    "total": 0,
    "warning": "...",
    "error_code": "ZOOM_MISSING_RECORDING_SCOPES",
    "required_scopes": [
      "cloud_recording:read:list_user_recordings",
      "cloud_recording:read:list_user_recordings:admin",
      "cloud_recording:read:list_account_recordings:master"
    ]
  }
  ```
- logger aussi les statuts des stratégies 2 et 3 pour savoir exactement si `/users` ou `/accounts/{accountId}/recordings` échouent par scope ou par compte.

Objectif : diagnostic durable sans devoir relire les logs à chaque fois.

### 3. Vérifier ou restaurer les scopes côté Zoom

Action côté configuration Zoom, hors code :

- ouvrir l’app Zoom Server-to-Server OAuth utilisée par `ZOOM_CLIENT_ID` ;
- vérifier/ajouter au moins un scope compatible :
  - `cloud_recording:read:list_user_recordings`
  - ou `cloud_recording:read:list_user_recordings:admin`
  - ou `cloud_recording:read:list_account_recordings:master`
- vérifier aussi les scopes de téléchargement d’enregistrement si l’import échoue ensuite sur `action: import` ;
- réactiver/reconnecter l’app Zoom si Zoom exige une nouvelle activation après ajout de scopes.

### 4. Re-tester sans modifier les données

Après correction des scopes :

- appeler `zoom-import-recordings` en `action: list` ;
- attendre une réponse avec `recordings.length > 0` ;
- vérifier que la réunion de mercredi/jeudi apparaît ;
- seulement ensuite tester l’import d’un enregistrement.

## Ce que je ne touche pas dans ce plan

- Pas de modification de `calendar-booking`.
- Pas de modification du webhook Zoom automatique.
- Pas de migration base de données.
- Pas de modification des transcriptions existantes.
- Pas de changement des secrets Zoom tant que les scopes Zoom n’ont pas été confirmés côté compte.

## Conclusion

Le module a probablement “régressé” fonctionnellement parce que l’autorisation Zoom actuelle ne contient plus les scopes Cloud Recording requis. Le code reçoit bien une erreur Zoom, mais l’UI l’affiche comme “aucun enregistrement trouvé”, ce qui rend le diagnostic invisible.