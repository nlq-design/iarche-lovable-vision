
# Audit & cahier des charges mis à jour — éditeur du programme invitation

## Reformulation correcte du besoin
Vous ne demandez pas un simple éditeur de texte enrichi. Vous voulez une nouvelle architecture d’édition, calquée sur la consultation :
- même rendu visuel en brouillon et en consultation ;
- tout le texte éditable inline ;
- les modules non textuels pilotables proprement ;
- le programme détaillé géré comme un vrai tableau métier, pas comme du HTML bricolé.

## Diagnostic corrigé

### 1. Le vrai débordement n’est pas seulement “le texte collé”
Le screenshot confirme un problème plus profond :
- le titre du hero et plusieurs libellés sont en `<input>` mono-ligne ;
- un `<input>` ne wrap pas, donc il coupe/déborde ;
- la vue brouillon n’est donc pas une vraie réplique de la consultation.

### 2. La gestion des tailles est quasi introuvable
La toolbar actuelle pose 3 problèmes :
- elle n’apparaît qu’après sélection dans un `contentEditable` ;
- elle ne s’applique pas aux champs en `<input>` ;
- la taille repose sur `execCommand('fontSize')`, trop peu fiable pour un rendu premium.

Résultat : techniquement il existe des actions, mais dans l’usage elles ne sont ni visibles ni pilotables.

### 3. Le “Programme détaillé” est mal modélisé
Aujourd’hui, il est essentiellement stocké comme HTML dans `section.content`.
Conséquences :
- impossible d’ajouter une vraie ligne de tableau proprement ;
- impossible de supprimer une ligne métier proprement ;
- impossible de garantir une structure stable pour le PDF, le public et le brouillon.

### 4. Les modules non textuels ne sont pas vraiment éditables
Il manque une vraie gestion pour :
- le lien du QR code ;
- le mode du bloc CTA/inscription ;
- le footer ;
- les éléments structurés du hero ;
- les lignes du tableau détaillé.

### 5. La parité brouillon / public n’est pas encore garantie
Le risque d’overflow HTML existe aussi côté public sur les sections.
Et surtout, l’architecture n’est pas unifiée :
- l’admin affiche un bloc QR ;
- le public affiche un formulaire.
Ce n’est pas le même module, donc ce n’est pas la même consultation.

## Architecture cible
Passer d’une logique “HTML libre par section” à une logique “document modulaire”.

Principe :
- un seul renderer visuel ;
- en brouillon, on active des affordances d’édition ;
- en consultation, on désactive l’édition ;
- la structure du document reste la même.

## Modèle cible dans `content_json`
Sans migration SQL, étendre le JSON existant :

- `sections[]` : prose libre, éditable inline
- `metadata` :
  - `eventTitle`
  - `eventDate`
  - `eventLocation`
  - `eventType`
  - `qrTitle`
  - `qrDescription`
  - `qrUrl`
  - `footerText`
  - presets de taille/hiérarchie si besoin
- `modules.programme.rows[]` :
  - `horaire`
  - `theme`
  - `intervenant`
- `modules.cta` :
  - mode `qr` / `form` / `qr+form`

## Plan d’implémentation

### Étape 1 — Corriger la base d’édition
- Remplacer les champs critiques en `<input>` mono-ligne par des zones éditables multi-lignes qui wrap comme la consultation.
- Garder un rendu visuellement identique au document final.
- Appliquer partout les contraintes anti-débordement : `min-w-0`, `break-words`, `whitespace-pre-wrap`, cellules de tableau robustes.

### Étape 2 — Rendre les tailles vraiment pilotables
- Abandonner la logique cachée via `fontSize` legacy.
- Ajouter des contrôles explicites et sémantiques au focus :
  - Hero : taille du titre
  - Titres de section : H2 / H3 / H4
  - Corps : paragraphe / petit texte
- Conserver gras / italique / souligné / listes / lien pour le texte libre.

### Étape 3 — Refaire le module “Programme détaillé”
- Sortir le tableau du HTML brut.
- Introduire un état structuré `modules.programme.rows`.
- En brouillon :
  - bouton discret `+ Ajouter une ligne` sous le tableau ;
  - suppression ligne par ligne au survol ou via action dédiée ;
  - si une ligne est vidée complètement puis validée, elle est retirée.
- En rendu :
  - le tableau garde exactement le look consultation ;
  - le HTML affiché est régénéré depuis les rows.

### Étape 4 — Cadrer les modules non textuels
- Hero : titre, type, date, lieu éditables sans casser la maquette.
- QR/CTA :
  - rendre `qrTitle`, `qrDescription` et `qrUrl` éditables ;
  - unifier le module entre admin et public ;
  - ne plus hardcoder des comportements différents selon la page.
- Footer : totalement éditable, même rendu dans les deux modes.

### Étape 5 — Compatibilité avec l’existant
Pour les invitations déjà générées :
- si `modules.programme.rows` n’existe pas, hydrater depuis `article.programme_detaille` quand disponible ;
- sinon parser le tableau HTML existant de la section `programme`.
Ainsi, on ne casse pas l’historique.

### Étape 6 — Parité publique
- `EventLanding.tsx` doit lire le même modèle de document.
- Même structure de rendu.
- Même protections anti-débordement.
- Même module CTA/QR.

## Critères d’acceptation
- Un titre long revient à la ligne sans déborder.
- L’utilisateur sait immédiatement où changer les tailles.
- Il peut ajouter une ligne au programme détaillé sans toucher au HTML.
- Il peut supprimer une ligne, et la ligne disparaît réellement du tableau.
- Le lien du QR code est modifiable.
- Le brouillon est la même architecture que la consultation.
- Aucun mot long, tableau ou URL ne sort du cadre.

## Détails techniques
- `src/pages/admin/AdminInvitationPreview.tsx`
  - refonte de l’état d’édition ;
  - remplacement des inputs mono-ligne critiques ;
  - ajout du module structuré programme + CTA/QR ;
  - fallback de compatibilité anciens documents.
- `src/components/admin/FloatingToolbar.tsx`
  - suppression de la dépendance au `fontSize` legacy ;
  - ajout de presets sémantiques visibles au focus/sélection.
- `src/pages/EventLanding.tsx`
  - lecture du même modèle structuré ;
  - parité de rendu ;
  - protections anti-débordement.
- Optionnel mais recommandé :
  - `supabase/functions/generate-document/index.ts`
  - faire générer dès l’origine `modules.programme.rows` en plus des sections, pour ne plus dépendre du parsing HTML sur les nouveaux documents.

## Impact métier
- Édition plus rapide et plus fiable.
- Réduction forte des erreurs visuelles avant partage/PDF.
- Suppression de la dépendance à un HTML fragile pour le programme détaillé.
- Base saine pour faire évoluer ensuite les autres modules d’invitation.

## Fichiers impactés
- `src/pages/admin/AdminInvitationPreview.tsx`
- `src/components/admin/FloatingToolbar.tsx`
- `src/pages/EventLanding.tsx`
- potentiellement `supabase/functions/generate-document/index.ts`

Aucune migration SQL obligatoire si on étend `content_json`.
