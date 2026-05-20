# Audit — Boucle "clic → contexte → réinjection IA" + Vocal

## 1. État actuel (audit)

### 1.1 Points d'entrée vers la boucle contextuelle
Tous les éléments IA du `/cockpit` routent vers **un seul drawer unifié** `AIActionDrawer` :

| Source | Composant | Route vers Drawer |
|---|---|---|
| TopActions (suggestions IA) | `TopActionsWidget` | ✅ via `AIActionDrawer` |
| Sentinelle (alertes SQL) | `SentinelWidget` + popover | ✅ via `alertToSnapshot()` |
| Cross-Signals (corrélations) | `CrossSignalsWidget` | ✅ |
| Prédictions / Stagnants | `PredictionsWidget`, `StagnantWidget` | ✅ |

→ **Architecture homogène confirmée**. Une seule UX de capture de contexte.

### 1.2 Ce que le drawer permet déjà
- Note libre (`addNote` → append `ai_actions.user_notes[]`)
- Mises à jour structurées (montant / échéance / contact) → push direct sur l'entité (`leads`/`opportunities`)
- Snooze + raison
- Dismiss + raison
- Auto-acknowledge silencieux à l'ouverture
- Historique unifié (notes + statuts + updates) avec timeline

### 1.3 Réinjection IA (la boucle)

**✅ Ce qui fonctionne :**
- `cockpit-ai-copilot/index.ts:1325` lit `user_notes` des `ai_actions` et les injecte dans le prompt LLM (contexte des 7 derniers jours).
- Les structured updates (montant/deadline/contact) modifient l'entité → bump `entityUpdatedAt` → **invalidation automatique du cache sémantique M6** (fingerprint inclut `entityUpdatedAt`) → prochain `suggestNextStep` / `intelligenceAggregator` est un MISS et recalcule.
- React Query invalide `entity-snapshot`, `cockpit-leads`, `cockpit-opportunities`, `cockpit-projects`.

**⚠️ Trous identifiés :**

1. **Note pure (sans structured update) = invisible pour le brief & next-step**
   Une note ajoute du texte dans `ai_actions.user_notes` mais ne touche aucune table d'entité.
   → `entityUpdatedAt` ne bouge pas → cache sémantique reste HIT → `suggestNextStep` et `daily_intelligence` ignorent la note jusqu'à la prochaine activité.
   → Seul le **chatbot copilot** (qui lit `ai_actions`) voit la note.

2. **Dismiss / snooze reasons** ne sont pas exposés au LLM
   Le champ `reason` enregistré dans `user_notes` (kind=`status`) est bien repris, mais le prompt ne distingue pas explicitement "raison de rejet" vs "note utilisateur" — le signal d'apprentissage est dilué.

3. **Sentinel digest** : un nouveau dismiss ne déclenche pas un rebuild de `sentinelDigest` → l'`intelligenceAggregator` peut servir un brief obsolète pendant 12h.

4. **Cross-signals** : aucun feedback boucle "j'ai traité ce signal" ne retourne dans `ai_cross_signals` pour ajuster le score.

### 1.4 Vocal
- AssemblyAI déjà câblé (`transcribe-audio-chunk`, chunking client, word_boost vocabulaire CRM).
- **Aucune intégration vocale dans le AIActionDrawer** ni dans l'ajout de note CRM.
- Pas de `useScribe` (realtime ElevenLabs) dans le projet.

---

## 2. Plan d'action

### Phase A — Combler les trous de réinjection (backend, surgical)

**A1. Invalider le cache next-step quand une note est ajoutée**
- Dans `useAIAction.addNote` : après append des notes, **bump `entity_updated_at`** sur l'entité ciblée (ou ajouter `lastNoteId` au fingerprint `next-step`).
- Préférer option B : étendre `FingerprintInput.lastActivityId` côté `cockpit-ai-copilot` pour inclure `max(user_notes.created_at)` lu depuis `ai_actions` filtrées par entité.
- Bénéfice : la prochaine "Prochaine étape IA" intègre la note utilisateur (TTL 1h respecté).

**A2. Forcer rebuild du brief intelligence sur dismiss/note critique**
- Dans le trigger `sentinel_trigger_queue` (déjà event-driven), ajouter un event sur `UPDATE ai_actions SET status='dismissed'`.
- Côté `intelligenceAggregator` : ajouter `sentinelDismissCount24h` au fingerprint pour casser le cache 12h quand l'utilisateur rejette plusieurs alertes.

**A3. Séparer "notes" vs "raisons de rejet" dans le prompt copilot**
- Dans `cockpit-ai-copilot:1325`, scinder les `user_notes` en deux blocs : `Notes utilisateur` (kind=`note`) et `Feedback (rejets/reports)` (kind=`status`).
- Objectif : le LLM apprend à éviter de re-proposer une action explicitement dismissée.

**A4. Boucle feedback Cross-Signals**
- Quand un cross-signal est traité via drawer (`done`/`dismissed`), insérer une ligne dans `ai_cross_signals_feedback` (nouvelle table légère : `signal_type`, `entity_id`, `verdict`, `user_id`).
- Le générateur de cross-signals lit cette table pour décrémenter le `score` des patterns ignorés (ML léger / heuristique).

### Phase B — Dictée vocale dans AIActionDrawer

**B1. Composant `<VoiceNoteInput>`**
- Bouton micro à droite du `Textarea` "note".
- 2 modes (settings utilisateur, défaut = streaming) :
  - **Streaming temps réel** : `useScribe` ElevenLabs (`scribe_v2_realtime`, VAD, fr) → transcription live affichée pendant qu'on parle, commit auto sur silence 1.5s.
  - **Push-to-talk batch** : enregistrement local → POST vers `transcribe-audio-chunk` (déjà déployé, AssemblyAI best, word_boost = `cockpit_vocabulary`).
- Choix techno : **AssemblyAI batch** (déjà en prod, vocabulaire CRM injecté, coût maîtrisé) sauf si user veut le wow effect streaming.

**B2. Pipeline d'enrichissement vocal**
1. Transcription brute → champ note.
2. Bouton "✨ Structurer" → appel `cockpit-ai-copilot` mode `parseVoiceNote` (nouveau endpoint léger) :
   - Input : transcript + snapshot entité courante.
   - Output JSON : `{ note: string, structured_updates: { new_amount?, new_deadline?, new_contact? }, suggested_status?: 'done'|'snoozed', confidence: number }`.
   - Modèle : `google/gemini-2.5-flash` (rapide, économique, déjà default).
3. Pré-remplissage automatique des champs structurés du drawer + diff before/after déjà existant → l'utilisateur valide d'un clic.

**B3. RAG / rapprochement entité**
- Si la transcription mentionne un nom propre absent de l'entité courante (ex: "appeler Marc plutôt que Sophie"), le copilot fait un `ilike` sur `contacts`/`leads` (déjà standard via [Anti-hallucination](mem://cockpit/intelligence/entity-resolution-anti-hallucination-fr)) et propose le rattachement.

**B4. UX dans le drawer**
- Position : icône micro inline dans le `Textarea` "Ajouter une note".
- États : `idle` → `recording` (waveform + timer) → `transcribing` (shimmer) → `parsed` (preview structuré).
- Raccourci : maintien `Espace` pour push-to-talk.
- Accessibilité : feedback visuel + son court de confirmation.

### Phase C — Observabilité

- Ajouter `cache_mode` analytics (déjà en place) : surface dans `RagDiagnosticsDrawer` un compteur "notes prises en compte / notes ignorées par cache".
- Tracer chaque transcription dans `ai_context_traces` (`source: 'voice_note'`, `latency_ms`, `confidence`).

---

## 3. Détails techniques

### Fichiers à modifier
- `supabase/functions/cockpit-ai-copilot/index.ts` : 
  - Split notes/feedback dans prompt builder (~ligne 1325).
  - Lecture `max(user_notes.created_at)` dans `buildContextFingerprint` next-step.
  - Nouveau mode `parseVoiceNote` (~80 lignes, schéma Zod).
- `src/hooks/cockpit/useAIAction.ts` : `addNote` bump `last_note_at` ou trigger côté DB.
- `src/components/cockpit/dashboard/AIActionDrawer.tsx` : intégration `<VoiceNoteInput>`.
- **Nouveau** `src/components/cockpit/dashboard/VoiceNoteInput.tsx`.
- **Migration** : 
  - Colonne `ai_actions.last_note_at TIMESTAMPTZ` + trigger update on `user_notes` change.
  - Table `ai_cross_signals_feedback` (optionnelle, phase A4).

### Hors scope
- Pas de refactor du semantic cache M6 (contrat v1 figé).
- Pas de remplacement d'AssemblyAI par ElevenLabs sauf si user demande streaming.
- Pas de re-générer le `daily_intelligence` à chaque note (trop coûteux) → on se contente d'invalider next-step (TTL 1h).

### Critères d'acceptation
1. Ajouter une note sur une action IA → la "Prochaine étape IA" suivante (dans l'heure) intègre cette note (vérif `cache_mode = 'miss'`).
2. Dismiss d'une alerte sentinelle → le brief intelligence du lendemain ne reproposera pas le même pattern.
3. Cliquer le micro → parler "Le client veut signer pour 15000 euros début juin" → champs `amount=15000` + `deadline=2026-06-01` pré-remplis automatiquement.
4. Aucune régression sur les flows existants du drawer.
