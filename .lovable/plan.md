# Rapport PDF "M4 Compliance" téléchargeable depuis Admin

## Objectif
Bouton sur le dashboard Admin qui génère et télécharge un PDF A4 listant les 19 contrôles M4 (A1–A8 backend/DB + B1–B11 frontend/auth) avec leur statut CONFORME / ÉCART / BLOQUANT, identité visuelle IArche (Blanc Cassé / Night Blue / Terracotta).

## Stack
- `jspdf@^4.0.0` (déjà installé, utilisé par `cockpitPdfExport`, `pdfHdExport`)
- Aucune dépendance ajoutée

## Fichiers à créer

### `src/lib/m4ComplianceReport.ts`
Générateur PDF pur (sans React). Exporte `generateM4ComplianceReport(): void` qui construit le PDF et déclenche `doc.save('m4-compliance-YYYY-MM-DD.pdf')`.

Structure du document :
- **Bandeau header Night Blue** (32mm) : titre « Rapport de conformité M4 », sous-titre « Authentification publique + Onboarding + Hardening RPC », date+heure de génération
- **Bloc synthèse** (carte arrondie blanche bordure light) : total / conformes / écarts / bloquants + **Verdict** en Terracotta gras
- **Section A. Backend & Base de données (A1–A8)** : titre Night Blue souligné Terracotta, puis 8 lignes carte arrondie : `[ID] [Label] [Pill statut coloré aligné à droite]`
- **Section B. Frontend & Auth (B1–B11)** : idem avec 11 lignes
- **Section Risques résiduels** : 3 puces (OAuth Google manuel, test accès non-admin post-onboarding, décision confirm-email Beta)
- **Footer sur chaque page** : ligne séparatrice + « IArche | Rapport interne M4 » à gauche, « Page X / N » à droite
- Pagination automatique : si `cursorY` dépasse `pageHeight - 18`, `doc.addPage()` avec re-fill background Blanc Cassé

Pills statut :
- CONFORME : bg vert clair, texte vert foncé
- ÉCART : bg orangé clair, texte ambre
- BLOQUANT : bg rouge clair, texte rouge foncé

Données contrôles : tableau statique en tête de fichier, alimenté par les findings de l'audit M4 précédent (tous CONFORME).

### `src/components/admin/M4ComplianceReportButton.tsx`
Composant React : `Card` (tokens shadcn) avec icône `FileCheck2` (lucide), titre, description, bouton « Télécharger le rapport PDF » (icône `Download` + `Loader2` pendant génération). État `generating` local. Toast succès/erreur via `sonner`. Couleurs : `bg-primary text-primary-foreground`.

## Fichier à modifier

### `src/pages/Admin.tsx`
- Import : `import M4ComplianceReportButton from '@/components/admin/M4ComplianceReportButton';`
- Insérer `<M4ComplianceReportButton />` dans le dashboard, **juste après la grille KPIs** (après `</div>` ligne 488, avant le commentaire `{/* Charts Row */}`). Section dédiée pleine largeur, cohérente avec les autres `Card` du dashboard.

## QA visuelle (obligatoire)
Après génération, conversion `pdftoppm -jpeg -r 150` du PDF généré (via test exec script) puis inspection :
- Pas de débordement texte hors carte / hors page
- Pills statut alignées à droite, lisibles
- Section A tient sur la page 1, section B + risques sur page 2 (à confirmer empiriquement)
- Footer présent sur toutes les pages
Itération si besoin (ajustement `rowHeight`, taille police, marges).

## Hors scope
- Pas de récupération dynamique des contrôles depuis la BDD (statuts statiques figés au moment du build M4 — c'est un snapshot de conformité, pas un monitoring temps réel)
- Pas de stockage du PDF dans Supabase Storage (download direct navigateur)
- Pas d'export CSV / JSON
- Pas de version multilingue
