
# Mini-CRM par SaaS — Plan d'exécution P0 → P2

Chaque solution du catalogue devient une unité CRM autonome avec ses propres modules. Tout est cross-référencé via `solution_id` (UUID de l'article `resource_type='solution'`).

## Audit BDD existant

- Existe : `opportunities`, `activity_log`, `workspace_ai_usage`, `invoices`, `subscriptions`, `plans`, `solution_leads`
- Manque : `solution_id` sur `opportunities`, tables `tickets`, `nps_responses`, `product_features`, `feature_votes`, `lead_sources`, `onboarding_milestones`

---

## SPRINT P0 — Mini-CRM exploitable (1-2 jours)

### 1. Pipeline commercial par solution
- **Migration** : `ALTER TABLE opportunities ADD COLUMN solution_id uuid REFERENCES articles(id)`
- **RPC** `get_solution_pipeline(p_solution_id)` SECURITY DEFINER → opportunités filtrées + KPIs (pipeline value, win rate, stages distribution, next steps)
- **UI** : nouvel onglet "Pipeline" dans `CockpitSolutionDetail` → table opportunités + funnel par stage + bouton "lier opportunité existante" + auto-tag depuis `solution_leads`
- **Auto-tag** : trigger qui propage `solution_id` de `solution_leads` vers opportunités créées depuis un lead lié

### 2. Utilisateurs actifs par SaaS
- **RPC** `get_solution_user_activity(p_solution_id)` → pour chaque workspace abonné, calcule depuis `activity_log` + `workspace_ai_usage` :
  - DAU/WAU/MAU
  - Top 5 features utilisées (group by action_type)
  - Dernière session
  - Score d'engagement (0-100)
- **UI** : onglet "Usage & Engagement" → table workspaces avec heatmap d'activité + alertes (workspaces inactifs > 14j)

### 3. Activity timeline transversale
- **RPC** `get_solution_timeline(p_solution_id, p_limit)` → fusion chronologique : leads, opportunités, abonnements, tickets, signatures CDC, transcriptions, mentions
- **UI** : onglet "Timeline" → flux unique scrollable par date, filtres par type d'événement

---

## SPRINT P1 — Boucle commerciale & support (3-4 jours)

### 4. Onboarding & Activation funnel
- **Migration** : table `onboarding_milestones` (workspace_id, solution_id, milestone, completed_at)
- **Milestones par défaut** : signup → première_connexion → premier_workflow → activation_paid → power_user (J7)
- **Triggers auto** depuis `activity_log` pour cocher les milestones
- **UI** : funnel visuel (Sankey) trial → active, time-to-value médian, drop-off par étape, liste workspaces bloqués + suggestion d'action IA

### 5. Revenus & Facturation détaillés
- **RPC** `get_solution_revenue(p_solution_id, p_period)` :
  - MRR break-down (new / expansion / contraction / churn)
  - LTV moyen par plan
  - Cohortes mensuelles (rétention)
  - Factures recentes via `invoices`
- **UI** : onglet "Revenus" → graphique MRR évolutif + table factures + alerte impayés

### 6. Support / Tickets / NPS
- **Migration** : tables `support_tickets` (workspace_id, solution_id, status, priority, subject, owner), `nps_responses` (workspace_id, solution_id, score 0-10, comment, created_at)
- **RPC** `get_solution_support_kpis(p_solution_id)` : tickets ouverts/SLA, NPS moyen, % détracteurs/promoteurs
- **UI** : onglet "Support & NPS" → kanban tickets + graphe NPS dans le temps + verbatim détracteurs

---

## SPRINT P2 — Croissance stratégique (5+ jours)

### 7. Roadmap & demandes clients
- **Migration** : tables `product_features` (solution_id, title, status enum[idea|planned|in_progress|shipped], votes_count), `feature_votes` (feature_id, workspace_id, weight)
- **UI** : onglet "Roadmap" → 4 colonnes statut, votes pondérés par MRR du workspace voteur, lien lecture publique

### 8. Marketing & Acquisition
- **Migration** : `lead_sources` (lead_id, channel, utm_source, utm_medium, utm_campaign, cost_eur), colonne `solution_id` sur `lead_sources`
- **Capture UTM** côté `FormBuilder` (déjà partiellement présent ?)
- **RPC** `get_solution_acquisition(p_solution_id)` : CAC par canal, ratio leads→clients, ROI campagne
- **UI** : onglet "Acquisition" → funnel par canal + classement ROI

---

## Architecture transverse

### Sécurité
- Toutes les RPC en `SECURITY DEFINER` avec garde `has_role(auth.uid(),'super_admin')` (catalogue SaaS = vue éditeur)
- RLS sur nouvelles tables : `workspace_member OR super_admin`

### UI/UX (réutilise standards existants)
- `CockpitSolutionDetail` passe à **12 onglets** organisés en 3 groupes : Commercial (Pipeline, Prospects, Onboarding, Acquisition, Revenus) / Produit (Vue, Roadmap, Documents) / Clients (Abonnements, Usage, Support, Timeline)
- Composants `LoadingState`/`EmptyState` standard, palette IArche, zero emoji
- Header sticky avec KPIs clés (MRR, # clients actifs, # opp en cours, NPS)

### Performance
- Vues matérialisées rafraîchies via cron 1h pour KPIs lourds (engagement, cohortes, MRR break-down)
- `daily_intelligence` étendu par solution → injecté dans le brief IA quotidien

### Réutilisation zero-duplication
- Le tab "Prospects" actuel reste, mais devient filtrable par stage et hérite du nouveau `solution_id` côté opportunité
- `activity_log` reste source unique de vérité pour usage + timeline
- Pas de table doublon : tout pointe vers `solution_id`

---

## Livrables par sprint

| Sprint | Migrations | RPCs | Composants UI | Onglets ajoutés |
|---|---|---|---|---|
| P0 | 1 (col + trigger) | 3 | 3 | Pipeline, Usage, Timeline |
| P1 | 3 tables | 3 | 3 | Onboarding, Revenus, Support/NPS |
| P2 | 3 tables | 2 | 2 | Roadmap, Acquisition |

## Ordre d'exécution proposé

1. **P0 d'abord en un seul lot** (migration unique + 3 RPCs + 3 composants UI) → tu valides la mécanique sur Cockpit by IArche
2. **P1 en deuxième lot** une fois P0 validé visuellement
3. **P2 en troisième lot** (le plus structurant produit, à faire quand tu auras un 2e SaaS pour valider la généricité)

Si tu approuves, je lance immédiatement **P0 complet** dans la prochaine itération (1 migration + 3 RPCs + refonte `CockpitSolutionDetail` avec les 3 nouveaux onglets), puis je te livre P1 et P2 en chaînage.
