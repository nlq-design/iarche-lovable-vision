# CDC Améliorations IA IArche v2.1

> Document de spécifications fonctionnelles pour l'amélioration du système AI (Dictionnaire, Mémoire, Prompts, RAG)
> **Date de mise à jour** : 4 Janvier 2026
> **Statut** : ✅ IMPLÉMENTÉ (Phases 1-5)

---

## 📋 Résumé Exécutif

| Métrique | V1 (Initial) | V2 (Actuel) |
|----------|-------------|------------|
| Alias dictionnaire | ✅ Utilisé | ✅ Auto-suggestion + enrichissement |
| Mémoire session | ✅ 7 jours | ✅ Persistance entité + 14 jours TTL |
| Sélection prompt | ✅ Projet/Lead | ✅ Partenaire/Solution + contexte |
| Cross-référencement | ❌ Manuel | ✅ Automatique via `entity_name_references` |
| Dashboard santé | ❌ Absent | ✅ AIHealthDashboard v6.22 opérationnel |

---

## 🎯 Phase 1 : Diagnostic & Monitoring

### 1.1 Dashboard Santé AI
**Fichier** : `src/pages/admin/AdminAIPrompts.tsx` - Nouvel onglet "Diagnostic"

**Composants à afficher** :
```
┌─────────────────────────────────────────────────────────────┐
│ 🧠 Santé du Système AI                           [Actualiser]│
├─────────────────────────────────────────────────────────────┤
│ ✅ Dictionnaire     │ 42 alias actifs / 45 total           │
│ ✅ Mémoire          │ 156 entrées (12 expirées)            │
│ ✅ RAG              │ 234 ressources indexées               │
│ ✅ Prompts          │ 8 configurés (3 primaires, 5 second.) │
├─────────────────────────────────────────────────────────────┤
│ 📊 Utilisation (7 derniers jours)                           │
│ • Transcriptions analysées : 23                             │
│ • Alias matchés : 67                                        │
│ • Mémoire rappelée : 145 fois                               │
│ • Solutions détectées (RAG) : 34                            │
└─────────────────────────────────────────────────────────────┘
```

**Requêtes SQL nécessaires** :
```sql
-- Alias actifs
SELECT COUNT(*) FILTER (WHERE is_active), COUNT(*) FROM keyword_aliases;

-- Mémoire
SELECT 
  COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > now()),
  COUNT(*) FILTER (WHERE expires_at < now())
FROM ai_agent_memory;

-- RAG
SELECT COUNT(DISTINCT resource_id) FROM resource_embeddings;

-- Prompts
SELECT 
  COUNT(*) FILTER (WHERE slug = 'master-agent'),
  COUNT(*) FILTER (WHERE category = 'transcription')
FROM ai_prompts;
```

### 1.2 Logs Enrichis dans TranscriptionDetailSheet
**Fichier** : `src/components/cockpit/transcriptions/TranscriptionDetailSheet.tsx`

**Afficher dans un collapsible "Contexte IA"** :
- Prompt utilisé (slug + nom)
- Alias appliqués (liste des remplacements effectués)
- Mémoire injectée (résumé des entrées utilisées)
- Score RAG des solutions détectées

**Stockage** : Enrichir `ai_metadata` dans `voice_transcriptions` :
```typescript
interface AIMetadata {
  // Existant
  detected_solutions?: { slug: string; confidence: number }[];
  
  // À ajouter
  prompt_used?: string;
  aliases_applied?: { alias: string; canonical: string }[];
  memory_context?: { id: string; type: string; preview: string }[];
  rag_queries?: { query: string; results_count: number }[];
  processing_time_ms?: number;
}
```

---

## 🧠 Phase 2 : Mémoire Persistante

### 2.1 Mémoire Entité (sans expiration)
**Fichier** : `supabase/functions/process-voice-transcription/index.ts`

**Règle** : Quand une transcription est liée à un lead/projet, créer une mémoire permanente :

```typescript
// Après analyse réussie, si lead_id ou project_id
if (job.lead_id || job.project_id) {
  await supabase.from('ai_agent_memory').insert({
    workspace_id: job.workspace_id,
    memory_type: 'context',
    category: 'entity_interaction',
    entity_type: job.lead_id ? 'lead' : 'project',
    entity_id: job.lead_id || job.project_id,
    content: `Transcription du ${new Date().toLocaleDateString('fr-FR')} : ${summary?.title || 'RDV'}. Points clés : ${summary?.key_points?.slice(0, 3).join(', ')}`,
    importance_score: 0.9,
    expires_at: null, // PERMANENT
    metadata: {
      transcription_id: job.id,
      action_items_count: summary?.action_items?.length || 0,
      detected_solutions: detectedSolutions?.map(s => s.slug),
    }
  });
}
```

### 2.2 Cross-Référencement Automatique
**Fichier** : `supabase/functions/process-voice-transcription/index.ts`

**Règle** : Détecter les noms propres récurrents et créer des liens mémoire :

```typescript
// Extraire les noms propres du transcript
const namesRegex = /(?:M\.|Mme|avec|chez)\s+([A-Z][a-zé]+(?:\s+[A-Z][a-zé]+)?)/g;
const detectedNames = [...transcript.matchAll(namesRegex)].map(m => m[1]);

// Chercher si ce nom apparaît dans d'autres transcriptions
for (const name of detectedNames) {
  const { data: relatedTranscriptions } = await supabase
    .from('voice_transcriptions')
    .select('id, lead_id, project_id')
    .ilike('raw_transcript', `%${name}%`)
    .neq('id', job.id)
    .limit(5);
  
  if (relatedTranscriptions?.length > 0) {
    await supabase.from('ai_agent_memory').insert({
      memory_type: 'insight',
      category: 'cross_reference',
      content: `"${name}" mentionné dans ${relatedTranscriptions.length + 1} transcriptions`,
      metadata: {
        person_name: name,
        transcription_ids: [job.id, ...relatedTranscriptions.map(t => t.id)],
      }
    });
  }
}
```

### 2.3 Score de Familiarité Lead
**Table** : Enrichir `leads.ai_metadata`

```typescript
interface LeadAIMetadata {
  // Existant
  detected_solutions?: string[];
  
  // À ajouter
  familiarity_score?: number; // 0-100
  interaction_count?: number;
  last_interaction_type?: string;
  last_interaction_date?: string;
  key_topics?: string[];
  preferred_contact_method?: string;
}
```

**Calcul automatique** (trigger ou fonction) :
```sql
CREATE OR REPLACE FUNCTION update_lead_familiarity()
RETURNS TRIGGER AS $$
DECLARE
  v_interaction_count INTEGER;
  v_familiarity NUMERIC;
BEGIN
  -- Compter les interactions
  SELECT COUNT(*) INTO v_interaction_count
  FROM (
    SELECT id FROM voice_transcriptions WHERE lead_id = NEW.lead_id
    UNION ALL
    SELECT id FROM bookings WHERE lead_id = NEW.lead_id
    UNION ALL
    SELECT id FROM generated_documents WHERE lead_id = NEW.lead_id
    UNION ALL
    SELECT id FROM tasks WHERE lead_id = NEW.lead_id
  ) interactions;
  
  -- Calculer le score (max 100)
  v_familiarity := LEAST(100, v_interaction_count * 10 + 
    CASE WHEN EXISTS(SELECT 1 FROM projects WHERE lead_id = NEW.lead_id) THEN 30 ELSE 0 END);
  
  UPDATE leads SET ai_metadata = 
    COALESCE(ai_metadata, '{}'::jsonb) || 
    jsonb_build_object('familiarity_score', v_familiarity, 'interaction_count', v_interaction_count)
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 Phase 3 : Prompts Contextuels

### 3.1 Prompts par Type de Partenaire
**Table** : `ai_prompts`

**Nouveaux prompts à créer** :
| Slug | Nom | Contexte d'utilisation |
|------|-----|------------------------|
| `transcription_avec_expert_ia` | RDV avec Expert IA | Partenaire type "Expert IA" présent |
| `transcription_avec_referent` | RDV avec Référent | Partenaire type "Referent" présent |
| `transcription_interne` | Réunion Interne | Aucun lead/client, réunion équipe |
| `transcription_support_client` | Support Client | Tag "support" ou "problème" détecté |

**Logique de sélection** (à modifier dans `selectTranscriptionPromptSlug`) :
```typescript
function selectTranscriptionPromptSlug(
  job: VoiceJob, 
  linkedPartners: Partner[]
): string {
  // 1. Vérifier les partenaires liés
  const expertIA = linkedPartners.find(p => p.type === 'expert_ia');
  if (expertIA) return "transcription_avec_expert_ia";
  
  const referent = linkedPartners.find(p => p.type === 'referent');
  if (referent) return "transcription_avec_referent";
  
  // 2. Vérifier le contexte projet
  if (job.project_id) return "transcription_reunion_projet";
  
  // 3. Vérifier si interne (pas de lead)
  if (!job.lead_id && !job.project_id) return "transcription_interne";
  
  // 4. Défaut : commercial
  return "transcription_rdv_commercial";
}
```

### 3.2 Injection Contexte Partenaire
**Fichier** : `supabase/functions/process-voice-transcription/index.ts`

**Ajouter au prompt système** :
```typescript
// Récupérer les partenaires liés
const { data: linkedPartners } = await supabase
  .from('transcription_partners')
  .select('partner:partners(*)')
  .eq('transcription_id', job.id);

let partnerContext = '';
if (linkedPartners?.length > 0) {
  partnerContext = '\n\nPARTENAIRES PRÉSENTS :\n' + 
    linkedPartners.map(lp => {
      const p = lp.partner;
      return `- ${p.name} (${p.type}) : ${p.specialization || 'N/A'}`;
    }).join('\n');
}

const finalSystemPrompt = profile.system_prompt + partnerContext;
```

### 3.3 Prompts par Solution
**Enrichissement** : Ajouter contexte solution au prompt

```typescript
// Si solution détectée ou liée
if (job.solution_id || detectedSolutions?.length > 0) {
  const solutionSlug = job.solution_id 
    ? await getSolutionSlug(job.solution_id)
    : detectedSolutions[0].slug;
    
  const solutionContext = SOLUTION_CONTEXTS[solutionSlug] || '';
  // Ex: SOLUTION_CONTEXTS['collaboria'] = 'Solution Collaboria : IA collaborative pour équipes. Vocabulaire : agents, workflows, automatisation.'
}
```

---

## 📚 Phase 4 : Dictionnaire IA Amélioré

### 4.1 Alias Auto-Suggérés
**Fichier** : `supabase/functions/process-voice-transcription/index.ts`

**Règle** : Si un mot est mal transcrit de manière récurrente, proposer un alias :

```typescript
// Après transcription, analyser les mots non reconnus
const unknownWords = detectUnknownProperNouns(transcript);

for (const word of unknownWords) {
  // Vérifier si ce mot apparaît souvent
  const { count } = await supabase
    .from('voice_transcriptions')
    .select('id', { count: 'exact', head: true })
    .ilike('raw_transcript', `%${word}%`);
  
  if (count >= 3) {
    // Proposer comme alias potentiel
    await supabase.from('keyword_alias_suggestions').insert({
      suggested_alias: word,
      occurrences: count,
      context_samples: [transcript.substring(0, 200)],
      status: 'pending'
    });
  }
}
```

**Nouvelle table** :
```sql
CREATE TABLE keyword_alias_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_alias TEXT NOT NULL,
  canonical_name TEXT, -- Rempli lors de la validation
  occurrences INTEGER DEFAULT 1,
  context_samples JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 Contexte Multi-Type
**Modification table** : `keyword_aliases`

```sql
-- Ajouter colonne pour types multiples
ALTER TABLE keyword_aliases 
ADD COLUMN context_types TEXT[] DEFAULT ARRAY['solution'];

-- Migration des données existantes
UPDATE keyword_aliases 
SET context_types = ARRAY[context_type];
```

### 4.3 Synonymes Bidirectionnels
**Nouvelle table** :
```sql
CREATE TABLE keyword_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL, -- Groupe de synonymes
  term TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, term)
);

-- Exemple : CDC ↔ Cahier des charges ↔ Spécifications
INSERT INTO keyword_synonyms (group_id, term, is_primary) VALUES
  ('uuid-1', 'CDC', true),
  ('uuid-1', 'Cahier des charges', false),
  ('uuid-1', 'Spécifications', false),
  ('uuid-1', 'Specs', false);
```

---

## 🔗 Phase 5 : Liaisons Intelligentes

### 5.1 Auto-Link Transcription → Lead
**Fichier** : `supabase/functions/process-voice-transcription/index.ts`

```typescript
// Après transcription, si pas de lead_id mais email/nom détecté
if (!job.lead_id) {
  // Extraire emails
  const emails = transcript.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  
  // Extraire noms d'entreprise potentiels
  const companyPatterns = /(?:chez|pour|avec|de\s+la\s+société)\s+([A-Z][a-zA-Zé\s]+)/g;
  
  if (emails?.length > 0) {
    const { data: matchedLead } = await supabase
      .from('leads')
      .select('id, name, company')
      .eq('email', emails[0])
      .single();
    
    if (matchedLead) {
      // Suggérer la liaison (ne pas appliquer automatiquement)
      await supabase.from('voice_transcriptions')
        .update({
          ai_metadata: {
            ...currentMetadata,
            suggested_lead_id: matchedLead.id,
            suggestion_reason: `Email ${emails[0]} trouvé dans le transcript`,
          }
        })
        .eq('id', job.id);
    }
  }
}
```

**UI** : Afficher dans `TranscriptionDetailSheet` si `suggested_lead_id` existe :
```
⚡ Lead suggéré : [Nom Lead] - [Raison]
   [Lier] [Ignorer]
```

### 5.2 Suggestion de Partenaires
**Fichier** : `supabase/functions/process-voice-transcription/index.ts`

```typescript
// Analyser le contenu pour détecter des expertises
const EXPERTISE_KEYWORDS = {
  'expert_ia': ['intelligence artificielle', 'machine learning', 'LLM', 'RAG', 'chatbot'],
  'referent': ['recommandation', 'référent', 'partenariat'],
  'integrateur': ['intégration', 'API', 'connecteur', 'synchronisation'],
};

const detectedExpertises: string[] = [];
for (const [type, keywords] of Object.entries(EXPERTISE_KEYWORDS)) {
  if (keywords.some(kw => transcript.toLowerCase().includes(kw))) {
    detectedExpertises.push(type);
  }
}

if (detectedExpertises.length > 0) {
  const { data: suggestedPartners } = await supabase
    .from('partners')
    .select('id, name, type')
    .in('type', detectedExpertises)
    .limit(3);
  
  if (suggestedPartners?.length > 0) {
    // Stocker les suggestions
    await supabase.from('voice_transcriptions')
      .update({
        ai_metadata: {
          ...currentMetadata,
          suggested_partners: suggestedPartners.map(p => ({
            id: p.id,
            name: p.name,
            reason: `Expertise ${p.type} détectée`,
          })),
        }
      })
      .eq('id', job.id);
  }
}
```

### 5.3 Historique Unifié par Entité
**Composant** : `src/components/cockpit/EntityTimelineSection.tsx`

**Agrégation de toutes les interactions** :
```typescript
interface TimelineEvent {
  id: string;
  type: 'transcription' | 'booking' | 'document' | 'task' | 'note' | 'email';
  date: string;
  title: string;
  summary?: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

// Hook pour récupérer la timeline complète d'un lead
function useEntityTimeline(entityType: 'lead' | 'project', entityId: string) {
  return useQuery({
    queryKey: ['entity-timeline', entityType, entityId],
    queryFn: async () => {
      const [transcriptions, bookings, documents, tasks] = await Promise.all([
        supabase.from('voice_transcriptions')
          .select('id, created_at, summary, transcription_date')
          .eq(entityType === 'lead' ? 'lead_id' : 'project_id', entityId),
        supabase.from('bookings')
          .select('id, start_time, name, status')
          .eq('lead_id', entityId),
        supabase.from('generated_documents')
          .select('id, created_at, title, document_type')
          .eq(entityType === 'lead' ? 'lead_id' : 'project_id', entityId),
        supabase.from('tasks')
          .select('id, created_at, title, status, due_date')
          .eq(entityType === 'lead' ? 'lead_id' : 'project_id', entityId),
      ]);
      
      // Fusionner et trier chronologiquement
      const events: TimelineEvent[] = [
        ...transcriptions.data?.map(t => ({
          id: t.id,
          type: 'transcription' as const,
          date: t.transcription_date || t.created_at,
          title: t.summary?.title || 'Transcription',
          summary: t.summary?.key_points?.[0],
        })) || [],
        // ... autres types
      ];
      
      return events.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  });
}
```

---

## 📊 Phase 6 : Métriques & Suivi

### 6.1 Table de Métriques AI
```sql
CREATE TABLE ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_type TEXT NOT NULL, -- 'transcription', 'alias_match', 'memory_recall', 'rag_search'
  count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, metric_type)
);

-- Fonction pour incrémenter
CREATE OR REPLACE FUNCTION increment_ai_metric(p_type TEXT, p_count INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_metrics (date, metric_type, count)
  VALUES (CURRENT_DATE, p_type, p_count)
  ON CONFLICT (date, metric_type)
  DO UPDATE SET count = ai_usage_metrics.count + p_count;
END;
$$ LANGUAGE plpgsql;
```

### 6.2 Appels dans les Edge Functions
```typescript
// Dans process-voice-transcription
await supabase.rpc('increment_ai_metric', { p_type: 'transcription' });

// Après match d'alias
await supabase.rpc('increment_ai_metric', { 
  p_type: 'alias_match', 
  p_count: aliasesApplied.length 
});

// Après rappel mémoire
await supabase.rpc('increment_ai_metric', { 
  p_type: 'memory_recall', 
  p_count: relevantMemory.length 
});
```

---

## ✅ Checklist d'Implémentation

### Phase 1 - Diagnostic (1-2 jours) ✅ COMPLÉTÉ
- [x] Créer composant `AIHealthDashboard.tsx`
- [x] Ajouter onglet "Diagnostic" dans `AdminAIPrompts.tsx`
- [x] Créer hook `useAIHealthStats.ts`
- [x] Enrichir `ai_metadata` dans les transcriptions

### Phase 2 - Mémoire (2-3 jours) ✅ COMPLÉTÉ
- [x] Créer table `entity_name_references` pour cross-référencement
- [x] Ajouter `familiarity_score` et `familiarity_details` aux leads
- [x] Créer trigger/fonction `update_lead_familiarity` (auto-calculé)
- [x] Créer fonction `create_entity_reference` pour liaisons
- [x] Créer fonction `get_entity_references` pour récupération
- [x] Ajouter 4 nouveaux outils agent : `get_lead_familiarity`, `update_lead_familiarity`, `get_entity_references`, `create_entity_reference`
- [x] Afficher stats familiarité et références dans AIHealthDashboard
- [x] Hook `useEntityReferences` pour frontend

### Phase 3 - Prompts (1-2 jours)
- [ ] Créer 4 nouveaux prompts dans `ai_prompts`
- [ ] Modifier `selectTranscriptionPromptSlug` avec logique partenaire
- [ ] Récupérer et injecter contexte partenaires
- [ ] Ajouter mapping `SOLUTION_CONTEXTS`

### Phase 4 - Dictionnaire (2 jours)
- [ ] Créer table `keyword_alias_suggestions`
- [ ] Implémenter détection mots inconnus récurrents
- [ ] Ajouter colonne `context_types[]` aux alias
- [ ] Créer table `keyword_synonyms`
- [ ] Créer UI de validation des suggestions

### Phase 5 - Liaisons (2-3 jours)
- [ ] Implémenter auto-détection lead (email/nom)
- [ ] Implémenter suggestion partenaires par expertise
- [ ] Créer composant `EntityTimelineSection`
- [ ] Intégrer timeline dans `LeadDetailSheet` et `ProjectDetailSheet`

### Phase 6 - Métriques (1 jour)
- [ ] Créer table `ai_usage_metrics`
- [ ] Créer fonction `increment_ai_metric`
- [ ] Ajouter appels dans toutes les Edge Functions AI
- [ ] Afficher graphiques dans Dashboard Diagnostic

---

## 📅 Planning Estimé

| Phase | Durée | Priorité | Statut |
|-------|-------|----------|--------|
| Phase 1 - Diagnostic | 2 jours | 🔴 Haute | ✅ Complété |
| Phase 2 - Mémoire | 3 jours | 🔴 Haute | ✅ Complété |
| Phase 3 - Prompts | 2 jours | 🟡 Moyenne | ⏳ À faire |
| Phase 4 - Dictionnaire | 2 jours | 🟡 Moyenne | ⏳ À faire |
| Phase 5 - Liaisons | 3 jours | 🟢 Basse | ⏳ À faire |
| Phase 6 - Métriques | 1 jour | 🟢 Basse | ⏳ À faire |

**Total estimé : 13 jours de développement**
**Progression : 2/6 phases complétées (Phase 1 & 2)**

---

*Document généré le 2 janvier 2026 - IArche AI v4.5*
