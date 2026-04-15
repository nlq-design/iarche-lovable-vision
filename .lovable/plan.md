

# Audit complet : Formulaire + QR Code sur la page evenement

## Problemes identifies

### 1. Formulaire invisible -- `article_id` NULL sur le formulaire actif
Le formulaire `7a72875b` (actif) a `article_id = NULL`. Il n'a jamais ete lie a l'article `69dc6219`.
- La RLS `Public can view active forms with article_id` exige `article_id IS NOT NULL`
- `EventLandingForm` requiert `.eq('article_id', articleId)` -- retourne vide
- Le formulaire doublon `6c2b3a02` (desactive) a egalement `article_id = NULL`

**Fix** : Migration SQL pour lier le formulaire a l'article :
```sql
UPDATE forms SET article_id = '69dc6219-2af3-46b0-8045-6959f299b899'
WHERE id = '7a72875b-618c-4d06-addf-b14d03d1f991';
```

### 2. QR Code absent de la page evenement
La page `EventLanding.tsx` n'affiche aucun QR Code. Il n'y a ni generation ni affichage de QR code pointant vers l'URL d'inscription.

**Fix** : Ajouter un composant QR Code dans la section inscription de `EventLanding.tsx` :
- Generer un QR code en client-side (librairie `qrcode.react` ou canvas)
- Le QR pointe vers l'URL courante avec `#inscription`
- Bouton "Telecharger le QR Code" (export PNG)

### 3. Documents doublons en base
12 `generated_documents` draft pour le meme article, 1 seul `approved`. Nettoyage recommande mais hors scope immediat.

## Plan d'implementation

### Etape 1 : Migration -- lier formulaire a l'article
- `UPDATE forms SET article_id = '69dc6219-...'` pour le formulaire `7a72875b`
- Necessite desactiver/reactiver le trigger comme precedemment

### Etape 2 : Ajouter QR Code a la page EventLanding
- Installer `qrcode.react` (ou utiliser canvas natif pour zero-dep)
- Creer un composant `EventQRCode` affichant le QR de l'URL courante
- Ajouter un bouton d'export PNG via `html-to-image` (deja installe dans le projet)
- Placer le QR dans la section inscription, a cote ou sous le formulaire

### Etape 3 : Post-audit
- Verifier que le formulaire s'affiche sur la page publique (anonymous access)
- Verifier que le QR code se genere et pointe vers la bonne URL
- Verifier l'export PNG

## Fichiers impactes

| Fichier | Action |
|---------|--------|
| Migration SQL | `UPDATE forms SET article_id` |
| `src/pages/EventLanding.tsx` | Ajout composant QR Code + export |
| `package.json` | Ajout `qrcode.react` si necessaire |

