

# Étape 1 — Utility HTML email-safe + route preview admin

Création d'une chaîne de transformation pure `content_json` → HTML email-safe Brevo, et d'une route de preview isolée. Aucune modification de l'éditeur existant, aucune migration BDD, aucune dépendance npm.

## Fichiers créés

### 1. `src/lib/email/types.ts`
Types TypeScript stricts reflétant la structure `generated_documents.content_json` :
- `InvitationMetadata` : eventTitle, eventDate, eventLocation, eventType, organizerName, footerText, qrTitle, qrDescription
- `InvitationSection` : id, order, title, content
- `ProgrammeRow` : horaire, theme, intervenant
- `InvitationContentJson` : { metadata, sections, modules: { programme: { rows } } }
- `BuildEmailHtmlOptions` : { publicUrl: string }

### 2. `src/lib/email/sanitize.ts`
Fonction `sanitizeSectionHtml(html: string): string` utilisant **DOMParser natif** (zéro dépendance).

Whitelist de tags : `p, br, strong, b, em, i, u, ul, ol, li, a, span`.

Règles :
- Strip `class="..."` systématique
- Strip `style="..."` sauf 4 propriétés autorisées : `color`, `font-weight`, `text-decoration`, `font-style`
- `<div>` → `<p style="margin:0 0 12px 0; color:#1A2B4A; line-height:1.6;">`
- `<ul>/<ol>` → inline `style="margin:0 0 16px 20px; padding:0; color:#1A2B4A;"`
- `<li>` → inline `style="margin:0 0 6px 0;"`
- `<a href>` → conserve `href`, force `style="color:#D15A3E; text-decoration:underline;"`, ajoute `target="_blank" rel="noopener"`
- Tags hors whitelist (script, iframe, img, etc.) → supprimés (children préservés en texte)

### 3. `src/lib/email/buildEmailHtml.ts`
Fonction principale `buildEmailHtml(content, options): string`.

**Helpers internes** :
- `escapeHtml(str: string): string` — échappe `& < > "`
- `renderHeroBlock(metadata)` — `<tr><td bgcolor="#1A2B4A">…</td></tr>`
- `renderSectionBlock(section)` — `<tr><td>` avec `<h2>` + `sanitizeSectionHtml(content)`
- `renderProgrammeBlock(rows)` — table 3 colonnes, header `#1A2B4A`, rows alternées `#FAF9F7/#FFFFFF`, **filtre `row.horaire && row.theme`**
- `renderCtaBlock(publicUrl)` — bouton bulletproof
- `renderFooterBlock(metadata)` — bandeau `#1A2B4A`

**Logique d'ordre des sections** :
1. Hero toujours en premier
2. Construire un tableau ordonné des blocs : pour chaque entrée des `sections` triées par `order`, si `id === 'programme'` insérer le bloc programme (rendu depuis `modules.programme.rows`), sinon rendre la section HTML normale
3. Si aucune section `id === 'programme'` n'existe mais `modules.programme.rows` est non vide → append en fin de liste avant CTA
4. CTA puis footer

**Document complet** : DOCTYPE + `<html lang="fr">` + `<head>` (charset, viewport, X-UA-Compatible, title) + `<body>` avec wrapper table 100% bgcolor `#F0EDE8` + container 600px bgcolor `#FFFFFF`.

**Couleurs strictes** : `#1A2B4A`, `#D15A3E`, `#FAF9F7`, `#F0EDE8`, `#FFFFFF`.
**Font stack** : `'Helvetica Neue', Arial, sans-serif`.
**Aucun gradient, aucune classe CSS, aucune image externe.**

### 4. `src/pages/admin/AdminInvitationEmailPreview.tsx`
Page admin wrappée dans `AdminLayout`.

Comportement :
- `useParams<{ id: string }>()` pour récupérer l'ID
- Fetch `generated_documents` par id via `supabase.from('generated_documents').select('*').eq('id', id).single()` (même pattern que `AdminInvitationPreview`)
- Cast `content_json` en `InvitationContentJson`
- Construit `publicUrl = \`https://iarche.fr/evenements/${slug}\``
- Appelle `buildEmailHtml(content, { publicUrl })`
- Layout :
  - **Bandeau header** : titre "Preview HTML email — largeur 600px rendue dans iframe" + bouton `Button variant="outline"` "Retour à l'édition" → `navigate(\`/admin/invitation/${id}\`)` + bouton "Copier HTML" (bonus utile pour debug, copie via `navigator.clipboard`)
  - **Iframe** : `<iframe srcDoc={html} style={{ width: '100%', minHeight: '800px', border: '1px solid #E5E5E5' }} title="Email preview" />`
  - **Textarea read-only** : affiche le HTML brut, monospace, hauteur 400px

États gérés : loading (LoadingState standard), error (EmptyState), not-found.

## Modification minimale

### 5. `src/App.tsx`
Ajout d'un seul lazy import + route :
```tsx
const AdminInvitationEmailPreview = lazy(() => import('./pages/admin/AdminInvitationEmailPreview'));
// …
<Route path="/admin/invitation/:id/email-preview" element={<AdminInvitationEmailPreview />} />
```
Placée juste après la route `/admin/invitation/:id` existante. Aucune autre modification.

## Garanties / contraintes respectées

| Contrainte | Garantie |
|---|---|
| `AdminInvitationPreview.tsx` inchangé | Aucun touch |
| BDD inchangée | Aucune migration |
| Aucune edge function | N/A |
| Aucune dépendance npm | DOMParser natif uniquement |
| Couleurs IArche strictes | Constantes inline dans `buildEmailHtml.ts` |
| 600px strict | `width="600" style="max-width:600px"` |
| Pas de Manrope en email | Font stack système email-safe |
| Pas de gradient | bgcolor solide `#1A2B4A` |
| TypeScript strict | Types explicites, zéro `any` |

## Test post-livraison

URL testable : `/admin/invitation/742926a9-217c-4ed3-96f2-7751e7c86476/email-preview`

Checklist de vérification fournie en réponse après build (13 points numérotés conformes à la demande).

## Hors scope (étape suivante, à valider après ce livrable)

- Bouton "Copier HTML email" sur `AdminInvitationPreview.tsx`
- Push API Brevo
- Variantes par template

