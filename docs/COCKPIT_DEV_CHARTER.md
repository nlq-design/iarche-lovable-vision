# Charte de Développement — Module Cockpit Commercial IArche

**Version :** 1.0.0  
**Date :** 21 décembre 2025  
**Statut :** ACTIVE — À respecter pour toute modification Cockpit

---

## 1. PRINCIPE FONDAMENTAL

> **"Le Cockpit ÉTEND l'Admin, il ne le DUPLIQUE jamais."**

Le module Cockpit Commercial est une **extension** du module Admin existant. Toute fonctionnalité partagée doit être centralisée dans des modules communs réutilisables.

---

## 2. ARCHITECTURE DES HOOKS

### 2.1 Structure des dossiers

```
src/hooks/
├── shared/                    # Hooks partagés Admin + Cockpit
│   ├── useBookings.ts         # Gestion des rendez-vous
│   ├── useLeads.ts            # Gestion des leads
│   └── useContacts.ts         # Gestion des contacts
├── cockpit/                   # Hooks spécifiques Cockpit
│   ├── useCockpitLeads.ts     # ÉTEND useLeads + qualification
│   ├── useCockpitBookings.ts  # ÉTEND useBookings + meeting notes
│   ├── useCockpitOpportunities.ts
│   ├── useCockpitProjects.ts
│   ├── useCockpitTasks.ts
│   └── index.ts
└── (autres hooks existants)
```

### 2.2 Règles d'implémentation

| Règle | Description |
|-------|-------------|
| **R1** | Les hooks `/shared/` contiennent la logique de fetch de base (React Query) |
| **R2** | Les hooks `/cockpit/` importent les hooks shared et AJOUTENT des fonctionnalités |
| **R3** | Aucun appel Supabase direct dans les pages (utiliser les hooks) |
| **R4** | Les mutations doivent invalider les caches React Query appropriés |

### 2.3 Pattern d'extension

```typescript
// ❌ INTERDIT — Duplication
export const useCockpitLeads = () => {
  const { data } = useQuery({
    queryKey: ['cockpit-leads'],
    queryFn: async () => {
      const { data } = await supabase.from('leads').select('*');
      return data;
    }
  });
};

// ✅ CORRECT — Extension
import { useLeads } from '@/hooks/shared/useLeads';

export const useCockpitLeads = () => {
  const baseHook = useLeads();
  
  // Ajouter les fonctionnalités cockpit-only
  const updateQualificationStatus = useMutation({...});
  
  return {
    ...baseHook,
    updateQualificationStatus,
    stats: computeCockpitStats(baseHook.leads),
  };
};
```

---

## 3. COMPOSANTS PARTAGÉS

### 3.1 Structure des dossiers

```
src/components/
├── shared/                    # Composants partagés
│   ├── StatusBadge.tsx        # Badges de statut génériques
│   ├── EntityCard.tsx         # Cartes génériques (lead, booking...)
│   └── DetailModals/          # Modaux de détail partagés
│       ├── LeadDetailModal.tsx
│       ├── BookingDetailModal.tsx
│       └── ContactDetailModal.tsx
├── admin/                     # Composants admin-only
├── cockpit/                   # Composants cockpit-only
│   ├── CockpitLayout.tsx
│   ├── CockpitSidebar.tsx
│   └── dialogs/
└── ui/                        # Composants UI de base (shadcn)
```

### 3.2 Règles de partage

| Composant | Emplacement | Utilisé par |
|-----------|-------------|-------------|
| StatusBadge | `/shared/` | Admin + Cockpit |
| LeadDetailModal | `/shared/DetailModals/` | Admin + Cockpit |
| BookingCard | `/shared/` | Admin + Cockpit |
| CockpitLayout | `/cockpit/` | Cockpit only |
| AdminLayout | `/layouts/` | Admin only |

---

## 4. FONCTIONS UTILITAIRES CENTRALISÉES

### 4.1 Fichier `/lib/formatters.ts`

Toutes les fonctions de formatage doivent être centralisées :

```typescript
// src/lib/formatters.ts

// Formatage monétaire
export const formatCurrency = (value: number, currency = 'EUR'): string => {...};

// Badges de statut
export const getStatusConfig = (status: string, type: EntityType) => {...};

// Labels de source
export const getSourceLabel = (source: string): string => {...};
export const getSourceBadgeColor = (source: string): string => {...};

// Types de réunion
export const getMeetingTypeLabel = (type: string): string => {...};
export const getMeetingTypeIcon = (type: string): ReactNode => {...};
```

### 4.2 Règle d'import

```typescript
// ❌ INTERDIT — Fonction locale dupliquée
const getStatusBadge = (status: string) => {
  switch (status) {...}
};

// ✅ CORRECT — Import centralisé
import { getStatusConfig } from '@/lib/formatters';
```

---

## 5. TABLES SUPABASE PARTAGÉES

### 5.1 Tables réutilisées (pas de duplication)

| Table | Admin | Cockpit | Notes |
|-------|-------|---------|-------|
| `leads` | ✅ | ✅ | Champs étendus : `qualification_status`, `lead_score` |
| `bookings` | ✅ | ✅ | Cockpit ajoute `meeting_notes` liées |
| `booking_types` | ✅ | ✅ | Lecture seule dans Cockpit |
| `contacts` | ✅ | ✅ | Lecture seule dans Cockpit |

### 5.2 Tables cockpit-only

| Table | Description |
|-------|-------------|
| `opportunities` | Pipeline commercial |
| `projects` | Projets clients |
| `tasks` | Tâches et relances |
| `meeting_notes` | Notes de réunion |
| `specifications` | Cahiers des charges |
| `activity_log` | Journal d'activité |
| `workspaces` | Multi-tenant |

---

## 6. CHECKLIST AVANT COMMIT

Avant toute modification du module Cockpit, vérifier :

- [ ] **Pas de doublon de hook** : Le hook n'existe pas déjà dans `/shared/` ou `/admin/`
- [ ] **Extension, pas duplication** : Si un hook shared existe, l'étendre
- [ ] **Fonctions centralisées** : Pas de fonctions utilitaires dupliquées
- [ ] **Composants partagés** : Vérifier si le composant existe déjà
- [ ] **Même table, même cache** : Utiliser les mêmes queryKeys React Query
- [ ] **RLS respectée** : Les policies cockpit sont vérifiées

---

## 7. MIGRATIONS À EFFECTUER

### Phase 1 : Hooks partagés (PRIORITÉ HAUTE)

1. Créer `/hooks/shared/useBookings.ts`
2. Créer `/hooks/shared/useLeads.ts`
3. Refactorer `useCockpitBookings` pour étendre `useBookings`
4. Refactorer `useCockpitLeads` pour étendre `useLeads`

### Phase 2 : Fonctions utilitaires

1. Créer `/lib/formatters.ts`
2. Migrer toutes les fonctions dupliquées
3. Mettre à jour les imports dans Admin et Cockpit

### Phase 3 : Composants partagés

1. Déplacer `LeadDetailModal` vers `/shared/DetailModals/`
2. Créer `StatusBadge` partagé
3. Mettre à jour les imports

### Phase 4 : Refactoring Admin (optionnel)

1. Migrer `AdminLeads.tsx` vers `useLeads`
2. Migrer `AdminRendezVous.tsx` vers `useBookings`

---

## 8. CONTACTS & RESPONSABILITÉS

| Rôle | Responsabilité |
|------|---------------|
| **Lovable AI** | Respecter cette charte à chaque modification |
| **Développeur** | Valider la conformité avant merge |
| **Architecte** | Mettre à jour cette charte si nécessaire |

---

**Document maintenu par :** Lovable AI  
**Dernière mise à jour :** 21 décembre 2025
