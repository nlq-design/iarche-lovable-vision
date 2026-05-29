# Fix MCP Cockpit — activity notes & transcriptions (3 bugs)

## État des lieux (audit codebase + BDD)

- **Bug #1 (lecture activity notes manuelles)** : déjà corrigé au tour précédent. `get_activity_log` lit bien `entity_id/entity_type` (ligne 1191-1192) + 39 entrées fantômes du 29/05 confirmées en BDD. Reste un **defect résiduel** : `create_activity_note` force `is_ai_generated: true` (ligne 808) pour TOUTES les notes — donc impossible de distinguer manuel/auto, et la garde anti-suppression du Bug #3 deviendrait inutilisable. À corriger.
- **Bug #2** : aucun tool `update_transcription` exposé. Table `voice_transcriptions` a `lead_id`, `project_id`, `lead_contact_id`, `title`, `status`, `synthesis_stale` — **pas d'`opportunity_id`**. Multi-contacts via `transcription_participants(linked_entity_type, linked_entity_id)`.
- **Bug #3** : aucun tool `delete_activity_note`. Table `activity_log` n'a **pas de colonne `archived_at`** — à ajouter pour soft-delete.

## Plan d'exécution

### 1. Migration SQL (1 seule)
- `ALTER TABLE public.activity_log ADD COLUMN archived_at timestamptz NULL, ADD COLUMN archived_by uuid NULL, ADD COLUMN archive_reason text NULL;`
- Index partiel : `CREATE INDEX activity_log_active_idx ON activity_log(workspace_id, created_at DESC) WHERE archived_at IS NULL;`
- **Purge automatique des 39 fantômes du 29/05** : `UPDATE activity_log SET archived_at = now(), archive_reason = 'ghost-cleanup-2026-05-29' WHERE created_at >= '2026-05-29 19:00:00' AND entity_type IN ('lead','project') AND entity_id NOT IN (SELECT id FROM leads UNION ALL SELECT id FROM projects) AND archived_at IS NULL;`

### 2. Edits `supabase/functions/mcp-server/index.ts`

**a) `create_activity_note`** (ligne 808) : remplacer `is_ai_generated: true` codé en dur par un paramètre optionnel `is_ai_generated: z.boolean().optional()` défaut `false`. Les notes manuelles deviennent donc supprimables ; les workflows IA passeront le flag explicitement.

**b) `get_activity_log`** (ligne 1182-1194) : ajouter `.is('archived_at', null)` pour exclure les archivés. Ajouter param optionnel `include_archived: boolean` (défaut false) pour debug.

**c) Nouveau tool `update_transcription`** (après TOOL 58) :
- Params : `transcription_id` (req), `project_id?`, `lead_id?`, `lead_contact_id?`, `contact_ids?: string[]`, `title?`, `status?`.
- (Note : pas d'`opportunity_id` en schéma — exclu du tool, documenté dans la description.)
- Build patch dict partiel (uniquement les champs fournis, accepte `null` pour unlink).
- Lit anciennes valeurs avant update pour marquer `synthesis_stale=true` sur ancien + nouveau `lead_id`/`project_id` (UPDATE sur `leads`/`projects`/`voice_transcriptions`).
- Si `contact_ids` fourni : upsert dans `transcription_participants` (insert manquants avec `linked_entity_type='contact'`, supprime les liens contact retirés).
- Filtre `workspace_id = ctx.wsId` strict.
- Retourne la transcription mise à jour + participants.

**d) Nouveau tool `delete_activity_note`** :
- Params : `activity_id` (req), `mode: 'soft'|'hard'` défaut `soft`, `reason?`.
- Pré-check : SELECT, refuse si `is_ai_generated = true` OU `activity_type LIKE 'transcription_%'` → erreur `"Cannot delete auto-generated activity"`.
- Vérifie `workspace_id = ctx.wsId`.
- `soft` : UPDATE `archived_at=now(), archived_by=ctx.userId, archive_reason=reason`.
- `hard` : DELETE strict.
- Retour `{ success, mode, activity_id }`.

**e) Registry** (ligne 5385) : ajouter `'update_transcription', 'delete_activity_note'` à la whitelist des tools exposés.

### 3. Déploiement & validation
- Déployer `mcp-server`.
- Test acceptance :
  1. `create_activity_note` (sans flag) → `get_activity_log` retourne la note (is_ai_generated=false).
  2. `delete_activity_note(soft)` → disparaît du `get_activity_log`, présente en BDD avec `archived_at`.
  3. `delete_activity_note` sur entrée `transcription_completed` → rejet.
  4. `update_transcription({transcription_id, project_id: X})` → `get_transcription_detail` montre nouveau lien + `synthesis_stale=true` sur ancien & nouveau projet.
- Compter en BDD que les 39 fantômes du 29/05 ont bien `archived_at IS NOT NULL`.

## Hors scope (volontaire)
- Pas d'`opportunity_id` sur transcriptions (colonne inexistante — nécessiterait migration séparée, non demandée explicitement).
- Pas d'`audit_log` table dédiée (réutilise `archive_reason` + `archived_by` sur la ligne elle-même).
- Pas de hard-delete bulk : workflow recommandé = soft systématique.

## Mémoires à mettre à jour après build
- `mem://cockpit/transcriptions/...` : ajouter référence au nouveau tool `update_transcription`.
- Nouvelle mémoire `mem://infrastructure/mcp/activity-log-soft-delete-v1` : flag manuel/auto, soft-delete, garde anti-suppression auto.
