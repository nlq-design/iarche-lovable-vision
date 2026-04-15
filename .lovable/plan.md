

# Fix: Exposer `create_article` et les tools manquants dans le MCP discovery

## Diagnostic

Le MCP server enregistre **87 tools** mais n'en expose que **45 via `tools/list`** grace a un filtre `_EXPOSED_TOOLS` (Set, ligne 5032). Claude.ai utilise `tools/list` pour decouvrir les tools disponibles — tout ce qui n'est pas dans le Set est invisible.

`create_article` (ligne 1852) est enregistre et callable, mais absent du Set.

## Correction

**Fichier** : `supabase/functions/mcp-server/index.ts`

Ajouter les tools manquants dans `_EXPOSED_TOOLS` (ligne 5032-5061) :

```typescript
// CONTENU — ajouter
'get_articles', 'create_article', 'update_article',
// PARTENAIRES — ajouter  
'get_partners', 'update_partner', 'get_partner_report',
// BOOKINGS
'get_bookings', 'create_booking',
// INSCRIPTIONS
'get_atelier_inscriptions',
```

**Pas de nouveau code, pas de nouvelle table.** Juste l'ajout des noms dans le Set existant.

## Impact

- Claude.ai verra immediatement les tools apres redeploy
- Aucun changement de comportement pour les tools deja exposes
- `tools/call` continue de fonctionner pour les 87 tools (pas de regression)

## Deploiement

Apres modification : deploy automatique de la edge function `mcp-server`. Le health check GET confirmera le count mis a jour.

## Estimation

Complexite : **S** (5 minutes)

