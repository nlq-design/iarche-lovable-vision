# Audit & plan — Étanchéité multi-tenant + Scaling cockpit

## Constat (compte `membre@nlq.fr` / workspace NLQ Test)

J'ai audité la base. Les fuites viennent de **policies RLS legacy non-scopées** qui coexistent avec les bonnes policies `workspace_id`. Comme Postgres applique un **OR** entre toutes les policies SELECT, la legacy ouverte annule la stricte.

### Constat précis sur `projects`
Deux policies SELECT actives simultanément :
- `projects_select` → `can_access_entity_workspace(workspace_id, auth.uid())` (OK, stricte)
- `Cockpit users can view projects` → `has_role('cockpit_user') OR has_role('cockpit_admin')` (**FUITE** : tout cockpit_user voit TOUS les projets)

C'est exactement le bug rencontré hier sur `leads`. Il faut faire le même nettoyage sur **toutes** les tables du périmètre cockpit.

### Sanctuaire Solutions
- `/cockpit/solutions` et `/cockpit/solutions/:id` (App.tsx l.767-772) sont aujourd'hui accessibles à tout détenteur du rôle `cockpit_user`.
- Pas de table `solutions` en BDD : c'est un module éditorial NLQ (catalogue interne de solutions IA proposées par NLQ aux clients). Il doit rester **réservé au workspace interne NLQ** (super_admin uniquement).

### Branding / charte graphique utilisateur
- Aucune table `branding_settings` ni `workspace_branding` n'existe.
- `generated_documents` n'a aucun champ branding ; les exports utilisent une charte hardcodée NLQ.
- Pour scaler vers d'autres clients, il faut un **workspace_branding** (logo, couleurs, police, mentions légales) injecté dans les générateurs.

---

## Plan d'action (3 lots, livrables séquentiels)

### Lot 1 — Étanchéité RLS cockpit (CRITIQUE, à faire en premier)

Migration unique qui :
1. **Drop** des policies legacy non-scopées sur :
   - `projects` (`Cockpit users can view projects`)
   - Audit complet pg_policies → toute policy qui contient `has_role('cockpit_user')` ou `has_role('cockpit_admin')` **sans** `is_workspace_member` ni `can_access_entity_workspace` est purgée.
2. **Vérification** que chaque table métier (`projects`, `project_documents`, `project_notes`, `project_contacts`, `opportunities`, `tasks`, `contacts`, `generated_documents`, `bookings`, `meeting_notes`, `tickets`, `invoices`, `subscriptions`) a bien une policy SELECT/UPDATE/DELETE scopée `can_access_entity_workspace` OU `is_workspace_member` + fallback super_admin.
3. **Conserver** les policies partner (`is_partner_user() AND is_project_partner(...)`) qui sont déjà bien scopées.

Résultat attendu : `membre@nlq.fr` ne voit plus aucun projet/contact/opportunity/document hors de son workspace NLQ Test.

### Lot 2 — Sanctuarisation `/cockpit/solutions` (NLQ-only)

1. Créer un helper `is_nlq_internal_user(user_id)` → `true` si membre du workspace `00000000-0000-0000-0000-000000000001` (IArche Interne).
2. Créer un composant `ProtectedNLQRoute` dans `src/components/cockpit/` qui :
   - attend `isLoading` (auth + role + workspace) avant de juger,
   - autorise uniquement `super_admin` OU membre du workspace interne NLQ,
   - sinon redirige vers `/cockpit` avec toast "Module réservé".
3. Wrapper les routes `/cockpit/solutions` et `/cockpit/solutions/:id` (App.tsx).
4. Masquer l'item "Solutions" du `CockpitSidebar` pour les non-NLQ.

### Lot 3 — Charte graphique workspace + injection dans les exports

1. **Migration** : table `workspace_branding`
   - `workspace_id` (PK, FK), `logo_url`, `logo_dark_url`, `primary_color`, `secondary_color`, `accent_color`, `font_family`, `legal_footer`, `email_signature`, `cover_image_url`.
   - Bucket Storage `workspace-branding` (public read, write réservé aux owners du workspace).
   - RLS : SELECT par membre du workspace, UPDATE par owner uniquement.
2. **UI** : nouvelle page `/cockpit/parametres/charte` (owner only) — upload logos, color picker, preview live.
3. **Injection** dans les générateurs existants :
   - `generate-cdc-devis`, `generate-document`, edge functions de PDF → charger `workspace_branding` du `workspace_id` du lead/projet et l'injecter dans le template HTML/PDF.
   - Fallback : charte NLQ si workspace sans branding défini.
4. **Email** : signature et logo dynamiques dans les templates Resend (override `email_signature` par workspace).

### Technique transversal (scaling)

- Toutes les futures tables métier doivent porter `workspace_id NOT NULL` + RLS via `can_access_entity_workspace` (déjà la norme — cf. mémoire `Multi-tenant Pivots v1`).
- Les edge functions cockpit qui bypassent RLS doivent **toujours** résoudre le `workspace_id` depuis le JWT user et l'injecter dans les writes (pattern déjà en place sur `stripe-checkout-session` après correctif d'hier).
- Aucune donnée NLQ ne doit fuiter vers d'autres workspaces, ni l'inverse.

---

## Ordre d'exécution proposé

1. **Maintenant** : Lot 1 (migration RLS) → fix immédiat de la fuite projets/contacts/etc. visible sur `membre@nlq.fr`.
2. **Ensuite** : Lot 2 (sanctuaire Solutions) → 1 migration + 1 composant + wrapping routes.
3. **Puis** : Lot 3 (branding) → plus gros chantier (table + UI + refonte générateurs + emails).

Confirme-moi si je démarre directement par le **Lot 1** (purge des policies legacy), ou si tu veux que j'enchaîne Lot 1+2 dans la foulée avant d'attaquer le branding.
