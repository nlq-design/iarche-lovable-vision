# Cahier des Charges V3.1.4 — Cockpit Commercial IArche

**Document de spécification FINALE DÉFINITIVE pour Lovable**

| | |
|---|---|
| **Projet** | Cockpit Commercial |
| **Version** | 3.1.4 (FINALE DÉFINITIVE) |
| **Date** | 21 décembre 2025 |
| **Contexte** | Extension Admin existant |

**Changelog V3.1.3 → V3.1.4 :**
- Fix: Ordre migrations corrigé (meeting_notes AVANT tasks)
- Fix: entity_type standardisé ('meeting_note' pas 'meeting')
- Fix: activity_log_insert durcie (can_access_entity_workspace)
- Fix: validate_status_transition APRÈS statuses
- Fix: Auto-insert owner sur CREATE workspace
- Fix: cockpit_reports = append-only (explicite)
- Add: workspace_id sur specifications (correction Lovable)
- Add: RLS leads qualification_status limitée cockpit_users
- Add: Index sur FK tasks/activity_log

---

> **Document complet disponible dans la version précédente du fichier.**
> **Cette version V3.1.4 intègre toutes les corrections de sécurité et d'ordre des migrations.**

## Ordre d'exécution des migrations (CRITIQUE)

```
PHASE 0: 001_cockpit_roles.sql (hors transaction)
PHASE 1: 002-006 Tables fondation (workspaces, members, auth)
PHASE 2: 007-013 Helper functions (ordre critique)
PHASE 3: 014 Trigger set_updated_at
PHASE 4: 015-030 Tables métier (statuses AVANT validate_status)
PHASE 5: 031 Index FK performance
PHASE 6: 032-035 Storage & RLS
PHASE 7: 036 pg_cron maintenance
```

## Points clés V3.1.4

1. **Step-up MFA** obligatoire pour accès Cockpit
2. **3 niveaux IA** : N0 (informatif), N1 (brouillon), N2 (exécution validée)
3. **Workspaces** multi-tenant avec propagation automatique
4. **entity_type** standardisé : `lead`, `opportunity`, `project`, `meeting_note`, `task`, `generated_document`
5. **RLS** durcie sur activity_log (vérification workspace)
6. **Tables append-only** : activity_log, cockpit_reports

---

**Statut :** Prêt pour implémentation Phase 1
