---
name: Compte User P2 — Admin Users + consolidation rôles
description: Page /admin/users (edge fn admin-list-users), super_admin = super-set implicite (admin+cockpit_admin+cockpit_user), nettoyage rôles cumulés
type: feature
---

## Phase P2 livrée (23/05/2026)

### Consolidation rôles
- `has_role(uuid, app_role)` mise à jour : `super_admin` implique automatiquement `admin`, `cockpit_admin`, `cockpit_user`
- `useCockpitAuth.ts` aligné : `hasSuperAdmin` accorde `hasCockpitUser` + `hasCockpitAdmin`
- Compte principal (89e12505…) nettoyé : 4 rôles → 1 (`super_admin` seul)

### Page /admin/users
- Route protégée `ProtectedAdminRoute`
- Edge fn `admin-list-users` (verify_jwt default true, super_admin requis via `assertSuperAdmin`)
- Retourne `auth.users` + `user_roles` + `profiles` + `workspace_members` agrégés
- UI : table avec email, nom, rôles (badges), provider, workspaces count, last_sign_in (relative fr), créé
- Lien ajouté dans `AdminSidebar` section "Sécurité & IA"

### Reste à faire (P3)
- Auto-création compte auth pour 7 partenaires sans `auth.user`
- Décision business : espace client visiteur `/mon-espace`
