

# Plan : Outils MCP manquants pour éditer programmes et formulaires

## Constat

Le serveur MCP expose déjà `get_documents` et `create_document`, mais :
- **Pas de `get_document_detail`** : impossible de lire le `content_json` (sections, metadata, modules) d'un programme invitation.
- **Pas de `update_document`** : impossible de modifier le contenu, les sections, les lignes du programme détaillé, le QR, le footer.
- **Pas de `update_form`** : on peut créer et lister les formulaires, mais pas les modifier (champs, paramètres, titre, activation).

## Outils à ajouter

### 1. `get_document_detail` (lecture complète)
- Input : `document_id` (UUID)
- Retourne : `id, title, document_type, status, version, content_json, article_id, lead_id, project_id, created_at, updated_at`
- Le `content_json` contient sections, metadata et modules — c'est la donnée nécessaire pour éditer via Claude.

### 2. `update_document` (modification programme/invitation)
- Input : `document_id` (UUID) + champs optionnels :
  - `title`, `status` (draft/approved)
  - `content_json` (JSON string complet — remplace l'existant)
  - `sections` (JSON string — met à jour uniquement `content_json.sections`)
  - `metadata` (JSON string — merge dans `content_json.metadata`)
  - `modules` (JSON string — merge dans `content_json.modules`)
- Logique : lecture du `content_json` actuel, merge intelligent des champs fournis, écriture.
- Sécurité : refuse la modification si `status = approved` (document figé).

### 3. `update_form` (modification formulaire)
- Input : `form_id` (UUID) + champs optionnels :
  - `title`, `description`, `slug`
  - `fields` (JSON string — champs du formulaire)
  - `settings` (JSON string — paramètres)
  - `is_active` (boolean)
  - `article_id` (UUID — lier à un atelier)
- Logique : update partiel, seuls les champs fournis sont modifiés.

## Whitelist

Ajouter les 3 outils dans `_EXPOSED_TOOLS` :
```
'get_document_detail', 'update_document', 'update_form'
```

## Fichier impacté

| Fichier | Action |
|---------|--------|
| `supabase/functions/mcp-server/index.ts` | Ajout de 3 tools + whitelist |

Aucune migration. Redéploiement automatique de l'edge function.

