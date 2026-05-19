# Vague 2 — Intelligence stratégique approfondie

Durée estimée : 2-3 semaines. 4 étapes séquentielles, chacune autonome et testable. Livrable défini pour chaque étape avant de passer à la suivante.

---

## Étape 2.1 — Réveil des 11 règles Sentinelle dormantes

**Objectif** : Passer de 2 à 13 catégories d'alertes SQL actives pour nourrir le LLM de signaux faibles riches.

**Tâches**
1. Auditer `ai_sentinel_alerts` actuelles (catégories actives vs dormantes selon prompt v10).
2. Implémenter les 11 règles SQL manquantes dans `cockpit-sentinel-scan` :
   - Lead oublié (no_activity > 14j sur lead chaud)
   - Opportunité zombie (stage stagnant > 21j)
   - Doublon contact/lead (fuzzy match nom+email)
   - Lead sans email valide
   - Proposition expirée (sent_at + validity dépassé)
   - Projet en dépassement budget (consumed > 80%)
   - Transcription non-liée à entité CRM > 48h
   - Tâche IA sans réponse > 7j
   - Booking sans préparation (briefing manquant J-1)
   - Pipeline déséquilibré (>60% sur 1 stage)
   - Cliente sans touchpoint > 30j post-livraison
3. Paramétrer seuils par règle dans table `sentinel_rules_config` (severity, debounce, TTL dismissal).
4. Ajouter index DB nécessaires pour perf.

**Livrable attendu**
- 13 catégories visibles dans `ai_sentinel_alerts` après scan
- Widget Sentinelle affiche au moins 5 catégories distinctes en conditions réelles
- Documentation : `mem://cockpit/intelligence/sentinel-rules-v2`

---

## Étape 2.2 — Mémoire temporelle (comparaison J-1 / J-7)

**Objectif** : L'IA détecte les tendances ("pipeline -15% vs J-7", "3 nouveaux leads chauds cette semaine") et pas juste l'instantané.

**Tâches**
1. Activer lecture de `daily_intelligence` historique dans `intelligenceAggregator` (J-1 + J-7 + J-30).
2. Calculer deltas côté edge fn : pipeline value, nb leads actifs, nb opps stage X, vélocité moyenne.
3. Injecter bloc `EVOLUTION TEMPORELLE` dans contexte LLM avec deltas chiffrés.
4. Mettre à jour prompt v3 : exiger au moins 1 prédiction qui s'appuie sur un delta temporel.
5. Ajouter widget `TrendDeltaWidget` (mini sparkline + delta % vs J-7).

**Livrable attendu**
- Le brief IA cite explicitement au moins 1 évolution temporelle ("pipeline en baisse de X% sur 7j")
- Widget Tendances visible sur dashboard
- Snapshot quotidien sauvegardé en BDD vérifiable

---

## Étape 2.3 — Pré-génération d'artefacts (drafts mail/devis/notes)

**Objectif** : Quand l'IA recommande "envoyer Diag 8 à Parham", elle génère aussi le draft email prêt à éditer/envoyer (gain 80% du temps).

**Tâches**
1. Étendre table `ai_actions` avec colonne `artifact` (JSONB : type + payload draft).
2. Edge fn `ai-action-artifact-generator` : pour chaque action top-5 de type `send_email`/`send_proposal`/`create_note`, génère le draft via Lovable AI (gpt-5 si email client-facing, gemini-flash sinon).
3. Récupérer contexte ciblé : dernière transcription du lead, dernier email reçu, vocabulary entity, owner_profile signature.
4. UI : bouton "Voir le draft" dans `AIActionDrawer` → modal éditable → bouton "Envoyer" (déclenche edge fn email existante) ou "Copier".
5. Tracker usage : taux d'acceptation draft, édits utilisateur (pour fine-tune prompt).

**Livrable attendu**
- 100% des actions top-5 de type email/devis ont un draft cliquable
- Draft email contient : objet, corps personnalisé, signature owner, CTA clair
- Métrique `artifact_acceptance_rate` exposée dans dashboard admin

---

## Étape 2.4 — Vrais cross-signals (transcription × inventaire × partner × opportunité)

**Objectif** : Remplacer "16 projets at_risk" (agrégation SQL) par des découvertes croisées non-triviales du type : *"Lead X mentionne besoin Y en transcription du 12/05 → Partner Z dispose de cette compétence → Opportunité Z stagne depuis 14j → recommander mise en relation."*

**Tâches**
1. Créer edge fn `cockpit-cross-signal-engine` (cron 1×/jour, 06:00 UTC) :
   - Index sémantique des transcriptions récentes (30j) via embeddings (déjà en place via `useVectorization`)
   - Match vs `partner_competences` + `solutions` actifs
   - Match vs `opportunities` en stage > 7j
   - Score combinaison (pertinence sémantique × valeur opp × ancienneté stagnation)
2. Stocker top 10 cross-signals dans nouvelle table `ai_cross_signals` (TTL 7j, dismissible).
3. Lire `ai_cross_signals` dans `intelligenceAggregator` → injecter bloc `CONNEXIONS CROISÉES` dans LLM.
4. Réécrire prompt section "cross_signals" : exiger lien explicite entre ≥2 entités de types différents avec citation source.
5. UI : `CrossSignalsWidget` refactor → afficher entités liées avec navigation clic vers chaque entité.

**Livrable attendu**
- Table `ai_cross_signals` peuplée quotidiennement (≥3 signaux/jour en conditions réelles)
- Widget CrossSignals affiche connexions multi-entités cliquables
- Au moins 1 cross-signal dans le brief IA cite explicitement 2+ entités sources

---

## Validation finale Vague 2

Avant de clôturer :
- Brief IA contient les 4 nouvelles dimensions (Sentinelle riche, évolution temporelle, drafts, cross-signals)
- Audit BDD : tables `ai_sentinel_alerts` (13 cat.), `ai_cross_signals` (peuplée), `ai_actions.artifact` (drafts générés)
- Pas de régression sur Vague 1 (consulte_count actif, gemini-2.5-pro, ROI prio)
- Mise à jour `mem://index.md` avec les 4 nouvelles entrées mémoire

---

## Confirmation requise

Je propose de démarrer par **l'Étape 2.1 (Sentinelle)** car elle conditionne la qualité des étapes suivantes (plus de signaux SQL → meilleur contexte LLM pour cross-signals et drafts).

Confirmes-tu la séquence 2.1 → 2.2 → 2.3 → 2.4, ou souhaites-tu réordonner (ex. commencer par 2.3 drafts pour ROI immédiat) ?
