# Cahier des Charges - Agent IA Cockpit IArche

> **Version**: 1.0  
> **Date**: 31 décembre 2024  
> **Statut**: En cours d'implémentation

---

## 1. Périmètre Validé

| # | Fonctionnalité | Description | Niveau Autonomie | Statut |
|---|----------------|-------------|------------------|--------|
| **1** | Transcription en direct | Transcription temps réel pendant appel téléphonique | N0 | ❌ TODO |
| **2** | Agent Vocal Débrief | Agent conversationnel pour débrief post-RDV + exécution d'actions vocales (ex: "Planifie un RDV avec X la semaine prochaine") | N1/N2 | ❌ TODO |
| **3** | Générateur Devis | Génération devis commercial depuis données projet/opportunité | N1 | ❌ TODO |
| **4** | Générateur CDC | Génération cahier des charges structuré depuis transcription | N1 | ✅ ACTIF |
| **5** | Emails de suivi | Génération emails pré-remplis depuis fiche lead (CockpitLeads) | N1 | ❌ TODO |
| **6** | Alertes stagnation | Détection opportunités stagnantes + suggestion relances | N0 | ❌ TODO |
| **7** | Lead Scoring contextuel | Scoring IA basé sur besoins détectés dans transcriptions (pas critères classiques) | N0 | ❌ TODO |

---

## 2. Fonctionnalités HORS PÉRIMÈTRE

Les éléments suivants NE SONT PAS inclus dans ce projet :

- ❌ Lead Scoring automatique basé sur critères classiques (taille entreprise, secteur...)
- ❌ Matching automatique solutions sans transcription
- ❌ Widget RAG intégré au Cockpit
- ❌ Enrichissement leads via sources externes
- ❌ Agent vocal public/client
- ❌ Chatbot IA généraliste

---

## 3. Spécifications Techniques

### 3.1 Transcription en Direct (Live)

**Objectif** : Transcrire en temps réel l'audio du micro pendant un appel téléphonique.

**Stack technique** :
- OpenAI Realtime API WebSocket (`gpt-4o-realtime-preview`)
- Frontend React avec `AudioRecorder` pour capture micro
- Affichage live token par token dans le Cockpit

**Flux** :
1. User clique "Démarrer transcription" dans fiche Lead/Projet
2. Connexion WebSocket vers Edge Function
3. Stream audio 24kHz PCM vers OpenAI
4. Réception transcription partielle en temps réel
5. Affichage live + sauvegarde finale en `meeting_notes`

**Intégration** : 
- Depuis LeadDetailSheet, ProjectDetailSheet
- Résultat stocké dans `meeting_notes` avec `ai_metadata.source = "live_transcription"`

---

### 3.2 Agent Vocal Débrief

**Objectif** : Agent conversationnel pour débriefing post-RDV et exécution d'actions par commande vocale.

**Cas d'usage** :
- "Planifie un RDV avec Jean Dupont la semaine prochaine"
- "Crée une tâche de relance pour le projet Acme dans 3 jours"
- "Résume le dernier RDV avec ce client"

**Stack technique** :
- OpenAI Realtime API WebRTC (basse latence)
- Tool calling pour actions (create_booking, create_task, get_summary)
- Contexte CRM injecté (lead, projet, historique)

**Niveau autonomie** :
- N1 : Propositions d'actions (brouillons)
- N2 : Exécution après confirmation vocale explicite

---

### 3.3 Générateur Devis

**Objectif** : Générer un devis commercial structuré depuis les données projet/opportunité.

**Inputs** :
- Données projet (nom, description, budget estimé)
- Données opportunité (valeur, probabilité)
- Solutions liées
- Contexte lead (entreprise, secteur)

**Output** : Document PDF avec :
- En-tête IArche (charte v4.0)
- Détail des prestations
- Conditions tarifaires
- Conditions générales

**Niveau autonomie** : N1 (brouillon éditable avant export)

---

### 3.4 Générateur CDC (Cahier des Charges)

**Statut** : ✅ ACTIF

**Description** : Génération de structure CDC depuis transcription vocale.

**Implémentation actuelle** :
- Edge function `process-voice-transcription` extrait :
  - `executive_summary`
  - `action_items`
  - `key_decisions`
  - `risks_and_blockers`
  - `detected_needs`
  - `next_steps`

**Évolutions prévues** :
- Template CDC structuré avec sections pré-définies
- Export Word/PDF conforme charte v4.0

---

### 3.5 Emails de Suivi Pré-remplis

**Objectif** : Générer des brouillons d'emails de suivi depuis la fiche lead.

**Types d'emails** :
1. **Premier contact** : Après réception d'un lead
2. **Suivi post-RDV** : Suite à un RDV enregistré
3. **Relance** : Lead sans activité depuis X jours
4. **Proposition commerciale** : Accompagnement d'un devis

**Inputs** :
- Données lead (nom, entreprise, contexte source)
- Historique activités
- Dernière transcription/meeting_note
- Solutions d'intérêt détectées

**Output** : Email pré-rempli avec :
- Objet
- Corps (personnalisé selon contexte)
- CTA approprié

**Niveau autonomie** : N1 (brouillon éditable, envoi manuel)

**Intégration** : Bouton "📧 Générer email" dans LeadDetailSheet

---

### 3.6 Alertes Opportunités Stagnantes

**Objectif** : Détecter les opportunités sans activité et suggérer des relances.

**Règles de détection** :
- Opportunité en stage `qualified`, `proposal`, `negotiation` depuis > 7 jours sans activité
- Lead avec dernier contact > 14 jours
- Tâche en retard liée à opportunité

**Actions** :
- Badge d'alerte dans pipeline
- Suggestion de relance avec template email
- Option création tâche de suivi

**Niveau autonomie** : N0 (informatif uniquement)

---

### 3.7 Lead Scoring Contextuel

**Objectif** : Scorer les leads basé sur les besoins détectés dans les transcriptions.

**Différence avec scoring classique** :
- ❌ NE PAS utiliser : taille entreprise, secteur, budget déclaré
- ✅ UTILISER : besoins explicites mentionnés dans transcriptions

**Critères de scoring** :
- Besoins détectés alignés avec solutions IArche (+20 pts par match)
- Urgence exprimée (+15 pts)
- Décisionnaire identifié (+10 pts)
- Contraintes bloquantes mentionnées (-10 pts)
- Concurrence mentionnée (-5 pts)

**Calcul** : Score 0-100 calculé après chaque transcription

**Niveau autonomie** : N0 (informatif, visible dans fiche lead)

---

## 4. Architecture Technique

### 4.1 Schéma de Flux

```
┌─────────────────────────────────────────────────────────────────┐
│                         COCKPIT UI                               │
├─────────────────────────────────────────────────────────────────┤
│  LeadDetailSheet  │  ProjectDetailSheet  │  TranscriptionPage   │
│       ↓                    ↓                      ↓              │
│  [📧 Email]         [📄 Devis]            [🎙️ Live]            │
└─────────┬──────────────────┬──────────────────────┬─────────────┘
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EDGE FUNCTIONS                              │
├─────────────────────────────────────────────────────────────────┤
│  generate-followup-email  │  generate-quote  │  realtime-stt    │
│           │                      │                   │           │
│           └──────────────────────┴───────────────────┘           │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │   Lovable AI    │                          │
│                    │  (gemini-2.5)   │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                 │
├─────────────────────────────────────────────────────────────────┤
│  leads  │  meeting_notes  │  activity_log  │  ai_prompts        │
│         │                 │                │                     │
│         │     ai_metadata: {              │                     │
│         │       autonomy_level: "N1",     │                     │
│         │       confidence: 0.85,         │                     │
│         │       validated_by_human: false │                     │
│         │     }                           │                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Prompts IA

Tous les prompts sont stockés dans `ai_prompts` avec :
- `slug` unique
- `system_prompt` avec contexte métier
- `output_schema` pour extraction structurée
- `model_config` pour paramétrage LLM

**Prompts à créer** :
- `generate-followup-email` : Génération emails de suivi
- `generate-quote` : Génération devis
- `lead-scoring-contextual` : Scoring depuis transcription
- `stagnation-alert` : Détection et suggestion relances

---

## 5. Priorités d'Implémentation

### Phase 1 : Emails de suivi ✅ En cours
- Bouton dans LeadDetailSheet
- Edge function `generate-followup-email`
- UI prévisualisation/édition

### Phase 2 : Alertes stagnation
- Requête détection dans pipeline
- Badges visuels
- Suggestions de relance

### Phase 3 : Lead Scoring contextuel
- Calcul post-transcription
- Affichage score dans fiche lead
- Explication des critères

### Phase 4 : Transcription live
- Integration WebSocket OpenAI
- UI temps réel
- Sauvegarde meeting_notes

### Phase 5 : Agent Vocal Débrief
- WebRTC OpenAI Realtime
- Tool calling (booking, tasks)
- Confirmation vocale N2

### Phase 6 : Générateur Devis
- Template PDF
- Calcul auto prestations
- Export charte v4.0

---

## 6. Critères de Succès

| Fonctionnalité | Métrique | Cible |
|----------------|----------|-------|
| Emails de suivi | Taux d'utilisation | > 50% des leads |
| Transcription live | Précision | > 95% |
| Lead Scoring | Corrélation conversion | > 0.6 |
| Alertes stagnation | Réduction délai relance | -30% |
| Agent Vocal | Actions exécutées/session | > 2 |

---

## 7. Changelog

| Date | Version | Modification |
|------|---------|--------------|
| 31/12/2024 | 1.0 | Création initiale du CDC |
