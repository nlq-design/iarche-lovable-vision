---
name: Content Gap Activation Phase L
description: Phase IA-2L — Telegram notif content_gap (high/medium) + section dashboard /admin/observability/ai
type: feature
---

## Phase IA-2L — Content Gap Activation (mai 2026)

Boucle de feedback complète sur Phase K : transformer la détection passive en signal proactif et visible.

### Telegram (proactif)
- Nouveau type `content_gap_alert` dans `telegram-proactive-notifications`
- Handler `handleContentGapAlert` formate severité + 3 sample_queries + lien dashboard
- Dédup via `telegram_sent_notifications` (entity_type='content_gap')
- Trigger : `rag-content-gap-detector` appelle l'edge en fire-and-forget pour chaque alerte créée **high OU medium** (ignore low pour limiter le bruit)

### Dashboard `/admin/observability/ai`
Nouvelle section "Lacunes contenu public (RAG)" en 2 colonnes :
- **Alertes Sentinelle ouvertes** (limit 20, badge sévérité, count occurrences)
- **Top clusters live** : appel direct `cluster_unanswered_rag(14, 2, 0.85)` pour visualiser même les clusters sub-seuil (≥2) avant qu'ils ne déclenchent une alerte
- Pas de coût LLM (RPC SQL pure)

### Garde-fous
- Notification Telegram uniquement sur création (pas sur réouverture déduplication)
- Seuil bruit : low severity (3-4 occurrences) → pas de notif Telegram, visible uniquement dashboard
- RPC `cluster_unanswered_rag` côté admin : `GRANT EXECUTE ... TO authenticated` mais lecture des données filtrée par RLS admin

### Évolutions v2 potentielles
- Bouton "Créer article" dans dashboard → pré-remplit `/admin/articles/new` avec representative_query comme titre
- Auto-resolved : trigger sur ajout d'article qui matche sémantiquement le representative_query (cosine ≥ 0.8) → UPDATE resolved_at
- Cron rétention 90j sur public_rag_unanswered
