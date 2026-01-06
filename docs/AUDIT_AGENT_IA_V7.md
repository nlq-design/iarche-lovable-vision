# 🔬 Audit & Cahier des Charges - Agent IA IArche Expert v7.0

**Date**: 06/01/2026  
**Version cible**: v7.0 (upgrade depuis v6.22)  
**Objectif**: Transformer l'agent IA d'un assistant réactif en un expert proactif métier

---

## 📊 PARTIE 1: ÉTAT DES LIEUX

### 1.1 Volumétrie Base de Données

| Entité | Volume | État |
|--------|--------|------|
| Leads | 24 | ✅ Actif |
| Projets | 5 | ✅ Actif |
| Opportunités | 5 | ✅ Actif |
| Partenaires | 3 | ✅ Actif |
| Tâches | 18 | ✅ Actif |
| Notes de réunion | 6 | ✅ Actif |
| Transcriptions | 5 | ✅ Actif |
| Documents générés | 3 | ✅ Actif |
| Spécifications | 2 | ✅ Actif |
| Articles/Ressources | 51 | ✅ Actif |
| Réservations (Agenda) | 21 | ✅ Actif |
| Prompts IA | 32 | ✅ Actif |

### 1.2 Architecture Actuelle des Prompts

```
ai_prompts (32 prompts synchronisés)
├── Gouverneur Principal (orchestrator-main)
├── Navigation (orchestrator-navigation)
├── Telegram v3 (telegram-agent-v3)
├── Consulte 360° (consulte-synthesis)
└── 28 prompts secondaires spécialisés
```

---

## 🐛 PARTIE 2: BUGS IDENTIFIÉS

### 2.1 Bugs Critiques (Bloquants)

| ID | Bug | Cause Racine | Status |
|----|-----|--------------|--------|
| BUG-001 | Timeout création RDV/Lead via Telegram | Timeout 25s insuffisant pour chaînes d'outils | ✅ Corrigé (45s) |
| BUG-002 | `/projets` - ambiguïté leads | Join `!inner` trop restrictif | ✅ Corrigé |
| BUG-003 | Fichiers audio >20MB rejetés | Limite arbitraire trop basse | ✅ Corrigé (50MB) |
| BUG-004 | Chunks audio trop gros | Dépassement limite Edge Function | ✅ Corrigé (9MB max) |

### 2.2 Bugs Majeurs (Non Corrigés)

| ID | Bug | Cause Racine | Impact |
|----|-----|--------------|--------|
| BUG-005 | Perte de contexte multi-messages | Pas de mémoire conversationnelle persistante | Agent oublie les infos données |
| BUG-006 | Recherche entités échoue ("beerecos") | Recherche exacte, pas fuzzy/phonétique | Entités introuvables |
| BUG-007 | Détection changement sujet trop agressive | Purge contexte prématurée | Perte d'infos pertinentes |
| BUG-008 | "Je n'ai pas pu traiter" sans détails | Erreurs non propagées au user | UX frustrante |
| BUG-009 | Demande infos déjà fournies | Contexte message précédent perdu | Conversations laborieuses |
| BUG-010 | Chaînage outils fragile | Pas de retry/fallback sur échec partiel | Opérations incomplètes |

### 2.3 Bugs Mineurs

| ID | Bug | Cause Racine |
|----|-----|--------------|
| BUG-011 | Format dates incohérent | Pas de normalisation |
| BUG-012 | Réponses parfois en anglais | Langue non forcée |
| BUG-013 | Doublons messages Telegram | Race condition |

---

## 🎯 PARTIE 3: LACUNES FONCTIONNELLES

### 3.1 Connaissance Métier Insuffisante

**Problème**: L'agent ne connaît pas notre activité.

**Manques identifiés**:
- [ ] Solutions IArche (SavoirIA, Agent IA, Cockpit Commercial, etc.)
- [ ] Processus commercial (qualification → audit → devis → closing)
- [ ] Tarification et offres
- [ ] Objections fréquentes et réponses
- [ ] Cas clients de référence
- [ ] Partenaires et leur rôle

### 3.2 Capacités Analytiques Limitées

**Problème**: L'agent liste mais n'analyse pas.

**Manques identifiés**:
- [ ] Synthèse intelligente des données
- [ ] Détection de patterns (leads chauds, projets à risque)
- [ ] Recommandations proactives
- [ ] Alertes automatiques

### 3.3 Proactivité Absente

**Problème**: L'agent attend les ordres.

**Comportement attendu**:
- Suggérer des actions pertinentes
- Alerter sur les urgences
- Proposer des optimisations
- Anticiper les besoins

---

## 🏗️ PARTIE 4: ARCHITECTURE CIBLE v7.0

### 4.1 Nouveau Système de Prompts Hiérarchique

```
┌─────────────────────────────────────────────────────────┐
│                 GOUVERNEUR v7.0                         │
│  (Personnalité + Règles + Connaissance Métier)          │
├─────────────────────────────────────────────────────────┤
│  COUCHE MÉMOIRE                                         │
│  - Contexte conversation (30 min TTL)                   │
│  - Entités actives (lead/projet en cours)               │
│  - Historique actions récentes                          │
├─────────────────────────────────────────────────────────┤
│  MODULES SPÉCIALISÉS                                    │
│  ├── Commercial (leads, opportunités, pipeline)         │
│  ├── Projets (specs, tâches, livrables)                 │
│  ├── Agenda (RDV, rappels, disponibilités)              │
│  ├── Documents (devis, CDC, contrats)                   │
│  ├── Intelligence (Consulte 360°, synthèses)            │
│  └── Admin (articles, ressources, paramètres)           │
├─────────────────────────────────────────────────────────┤
│  OUTILS (100+ tools CRUD)                               │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Prompt Gouverneur v7.0 (Nouveau)

```markdown
# IDENTITÉ

Tu es **Nicolas**, l'expert IA senior d'IArche. Tu n'es PAS un assistant générique.
Tu connais parfaitement notre activité, nos clients, nos solutions et notre équipe.

## TON NIVEAU D'EXPERTISE

- 5+ ans d'expérience virtuelle sur le CRM IArche
- Connaissance intime de chaque lead, projet et partenaire
- Maîtrise du processus commercial de A à Z
- Capacité d'analyse stratégique

## TES RESPONSABILITÉS

1. **PROACTIVITÉ**: Ne te contente JAMAIS de répondre. Propose, suggère, alerte.
2. **CONTEXTE**: Mémorise TOUT ce qu'on te dit dans la conversation.
3. **EXPERTISE**: Parle en expert, pas en stagiaire. Donne ton avis.
4. **FIABILITÉ**: Vérifie tes données. En cas de doute, dis-le clairement.

## CONNAISSANCE MÉTIER IARCHE

### Nos Solutions
- **SavoirIA 64**: Formation IA pour entreprises (1 jour, 490€/pers)
- **Agent IA IArche**: Chatbot/voicebot sur-mesure (à partir de 2500€)
- **Cockpit Commercial**: CRM IA avec pipeline intelligent
- **Audit IA Gratuit**: Diagnostic 30min pour qualifier les leads

### Processus Commercial
1. Lead entrant → Qualification (BANT)
2. Audit IA gratuit (30 min visio)
3. Proposition commerciale personnalisée
4. Négociation et closing
5. Onboarding projet

### Signaux d'Achat à Détecter
- Urgence mentionnée ("rapidement", "urgent", "deadline")
- Budget confirmé
- Décideur identifié
- Besoin concret exprimé
- Comparaison concurrence

### Signaux d'Alerte
- Pas de réponse depuis 7+ jours
- Objection prix non traitée
- Projet sans prochaine action
- RDV annulé sans reprogrammation

## RÈGLES DE COMPORTEMENT

### Mémoire Conversationnelle
- Retiens TOUTES les infos données dans les 30 dernières minutes
- Si on te donne un email, associe-le au contexte en cours
- Ne redemande JAMAIS une info déjà fournie

### Recherche d'Entités
- Utilise la recherche fuzzy/phonétique
- "beerecos" = "Beerecos" = "BEERECOS"
- En cas d'ambiguïté, propose les options

### Gestion des Erreurs
- Ne dis JAMAIS "Je n'ai pas pu traiter" sans explication
- Donne TOUJOURS la raison de l'échec
- Propose TOUJOURS une alternative

### Chaînage d'Outils
- Exécute les opérations en séquence logique
- Si un outil échoue, retente 1 fois
- Si échec persistant, explique et propose alternative

## FORMAT DE RÉPONSE

### Structure Standard
1. Action réalisée (ou erreur avec explication)
2. Résultat ou données demandées
3. Suggestion proactive (si pertinent)

### Exemple
❌ "Voici les 5 derniers leads."
✅ "Voici les 5 derniers leads. Je remarque que **Marie Pecot** n'a pas été contactée depuis 3 jours - voulez-vous que je programme un rappel ?"
```

### 4.3 Corrections Techniques Requises

#### A. Mémoire Conversationnelle Persistante

```typescript
// Structure conversation_context à implémenter
interface ConversationContext {
  telegram_chat_id: string;
  user_id?: string;
  active_entities: {
    lead_id?: string;
    project_id?: string;
    opportunity_id?: string;
  };
  collected_info: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    date?: string;
    time?: string;
  };
  last_intent?: string;
  created_at: string;
  expires_at: string; // +30 min
}
```

#### B. Recherche Fuzzy/Phonétique

```sql
-- Fonction de recherche améliorée
CREATE OR REPLACE FUNCTION search_entities_fuzzy(
  search_term TEXT,
  entity_types TEXT[] DEFAULT ARRAY['lead', 'project', 'partner']
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'lead'::TEXT, l.id, l.name, 
         similarity(lower(l.name), lower(search_term))
  FROM leads l
  WHERE 'lead' = ANY(entity_types)
    AND (
      lower(l.name) LIKE '%' || lower(search_term) || '%'
      OR similarity(lower(l.name), lower(search_term)) > 0.3
      OR lower(l.company) LIKE '%' || lower(search_term) || '%'
    )
  UNION ALL
  SELECT 'project'::TEXT, p.id, p.name,
         similarity(lower(p.name), lower(search_term))
  FROM projects p
  WHERE 'project' = ANY(entity_types)
    AND (
      lower(p.name) LIKE '%' || lower(search_term) || '%'
      OR similarity(lower(p.name), lower(search_term)) > 0.3
    )
  UNION ALL
  SELECT 'partner'::TEXT, pa.id, pa.name,
         similarity(lower(pa.name), lower(search_term))
  FROM partners pa
  WHERE 'partner' = ANY(entity_types)
    AND (
      lower(pa.name) LIKE '%' || lower(search_term) || '%'
      OR similarity(lower(pa.name), lower(search_term)) > 0.3
    )
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;
```

#### C. Retry Mechanism pour Outils

```typescript
async function executeToolWithRetry(
  tool: string,
  params: any,
  maxRetries: number = 2
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeTool(tool, params);
    } catch (error) {
      lastError = error as Error;
      console.log(`Tool ${tool} attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}
```

---

## 📋 PARTIE 5: PLAN D'IMPLÉMENTATION

### Phase 1: Corrections Critiques (Immédiat)
- [x] Augmenter timeout Telegram (25s → 45s)
- [x] Corriger join `/projets`
- [x] Augmenter limite fichiers audio (50MB)
- [ ] Implémenter mémoire conversationnelle
- [ ] Ajouter recherche fuzzy

### Phase 2: Upgrade Prompts (Jour 1-2)
- [ ] Créer nouveau prompt Gouverneur v7.0
- [ ] Intégrer connaissance métier IArche
- [ ] Ajouter règles de proactivité
- [ ] Configurer détection signaux

### Phase 3: Robustesse (Jour 3)
- [ ] Implémenter retry mechanism
- [ ] Améliorer messages d'erreur
- [ ] Ajouter fallbacks intelligents
- [ ] Tests end-to-end Telegram

### Phase 4: Intelligence (Jour 4-5)
- [ ] Activer recommandations proactives
- [ ] Configurer alertes automatiques
- [ ] Intégrer scoring leads dynamique
- [ ] Dashboard santé agent

---

## ✅ CRITÈRES DE SUCCÈS

| Métrique | Avant | Cible v7.0 |
|----------|-------|------------|
| Taux de succès commandes Telegram | ~60% | >95% |
| Recherche entités réussie | ~40% | >90% |
| Temps réponse moyen | 8-15s | <5s |
| Contexte retenu multi-messages | 0% | 100% |
| Suggestions proactives | 0 | 3+ par session |

---

## 🚀 PROCHAINES ÉTAPES

1. **Validation** de cet audit par l'équipe
2. **Implémentation** Phase 1 (corrections critiques)
3. **Test** sur environnement Telegram
4. **Itération** selon retours

---

*Document généré le 06/01/2026 - IArche AI Team*
