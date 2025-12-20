# IArche — Pack Templates LinkedIn Pro
## 8 Carrousels + 3 Bannières + 4 Posts

> **Objectif** : Templates métier avec slots verrouillés, limites de caractères, et prévisualisation mobile par défaut.

---

## CARROUSELS LINKEDIN (1080×1350)

### Template 1 : Hook / Promesse

**Intent** : Slide d'accroche pour capter l'attention

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| H1 (Hook) | Texte | 60 | ✅ |
| Arc | Décor | — | ✅ (sous H1) |
| Sous-titre | Texte | 80 | ❌ |
| Tag/Label | Badge | 20 | ❌ |

**Layout** :
```
┌────────────────────────┐
│  [Logo]                │
│                        │
│                        │
│  ██████████████████    │  ← H1 (centré)
│  ════════════════      │  ← Arc
│  Sous-titre            │
│                        │
│            [Tag]       │
└────────────────────────┘
```

---

### Template 2 : Problème Terrain

**Intent** : Identifier la douleur du prospect

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| H1 | Texte | 50 | ✅ |
| Bullets (×3) | Liste | 40 chacun | ✅ |
| Pain Line | Texte emphase | 60 | ❌ |

**Layout** :
```
┌────────────────────────┐
│  [Logo]                │
│                        │
│  LE PROBLÈME           │  ← H1
│  ════════════════      │  ← Arc
│                        │
│  • Bullet 1            │
│  • Bullet 2            │
│  • Bullet 3            │
│                        │
│  "Pain line citation"  │
└────────────────────────┘
```

---

### Template 3 : Insight / Méthode

**Intent** : Apporter une perspective unique

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| H1 (Insight) | Texte | 50 | ✅ |
| Corps | Paragraphe | 150 | ✅ |
| Highlight | Texte emphase | 40 | ❌ |

---

### Template 4 : Avant / Après

**Intent** : Montrer la transformation

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| Label "Avant" | Badge | 10 | ✅ |
| Contenu Avant | Texte | 80 | ✅ |
| Label "Après" | Badge | 10 | ✅ |
| Contenu Après | Texte | 80 | ✅ |

**Layout** :
```
┌────────────────────────┐
│  [Logo]                │
│                        │
│  ┌─── AVANT ─────────┐ │
│  │ Texte situation   │ │
│  │ initiale          │ │
│  └───────────────────┘ │
│           ↓            │
│  ┌─── APRÈS ─────────┐ │
│  │ Texte situation   │ │
│  │ transformée       │ │
│  └───────────────────┘ │
└────────────────────────┘
```

---

### Template 5 : Preuve / Chiffres

**Intent** : Crédibiliser avec des données

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| Chiffre Principal | Texte XL | 10 | ✅ |
| Label Chiffre | Texte | 30 | ✅ |
| Source | Caption | 50 | ❌ |

**Layout** :
```
┌────────────────────────┐
│  [Logo]                │
│                        │
│                        │
│       +85%             │  ← Chiffre (très grand)
│  ════════════════      │  ← Arc
│  de productivité       │  ← Label
│  en 3 mois             │
│                        │
│  Source: Étude interne │
└────────────────────────┘
```

---

### Template 6 : Process 3 Étapes

**Intent** : Expliquer une méthode simple

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| H1 | Texte | 40 | ✅ |
| Étape 1 | Texte + Numéro | 50 | ✅ |
| Étape 2 | Texte + Numéro | 50 | ✅ |
| Étape 3 | Texte + Numéro | 50 | ✅ |

**Layout** :
```
┌────────────────────────┐
│  [Logo]                │
│                        │
│  NOTRE MÉTHODE         │
│  ════════════════      │
│                        │
│  ① Étape 1             │
│     ↓                  │
│  ② Étape 2             │
│     ↓                  │
│  ③ Étape 3             │
└────────────────────────┘
```

---

### Template 7 : Objections / Réponses

**Intent** : Lever les freins

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| Objection | Texte italique | 60 | ✅ |
| Réponse | Texte | 100 | ✅ |

**Layout** :
```
┌────────────────────────┐
│  [Logo]                │
│                        │
│  "L'IA c'est trop      │  ← Objection
│   compliqué pour       │
│   les PME"             │
│                        │
│  ════════════════      │  ← Arc séparateur
│                        │
│  En réalité...         │  ← Réponse
│  [Explication]         │
└────────────────────────┘
```

---

### Template 8 : CTA / Contact

**Intent** : Convertir

| Slot | Type | Max caractères | Obligatoire |
|------|------|----------------|-------------|
| Logo | Image | — | ✅ |
| H1 (CTA) | Texte | 40 | ✅ |
| Sous-texte | Texte | 60 | ❌ |
| URL/Contact | Texte emphase | 30 | ✅ |
| Baseline | Tagline | 40 | ❌ |

**Layout** :
```
┌────────────────────────┐
│  [Logo]                │
│                        │
│                        │
│  PASSEZ À L'ACTION     │  ← H1
│  ════════════════      │  ← Arc
│                        │
│  Prenez rendez-vous    │
│                        │
│  → iarche.fr/rdv       │  ← CTA emphase
│                        │
│  L'IA se construit     │  ← Baseline
│  avec vous             │
└────────────────────────┘
```

---

## BANNIÈRES LINKEDIN (1584×396)

### Template B1 : Fondateur

**Intent** : Personal branding CEO/Expert

| Slot | Max caractères |
|------|----------------|
| Logo | — |
| Nom | 30 |
| Titre | 40 |
| Tagline | 50 |
| Photo (optionnel) | — |

---

### Template B2 : Produit

**Intent** : Mettre en avant une solution

| Slot | Max caractères |
|------|----------------|
| Logo | — |
| Nom Produit | 25 |
| Bénéfice Principal | 50 |
| CTA discret | 20 |

---

### Template B3 : Écosystème

**Intent** : Vision globale IArche

| Slot | Max caractères |
|------|----------------|
| Logo | — |
| Headline | 40 |
| 3-4 mots-clés | 15 chacun |
| Baseline | 40 |

---

## POSTS LINKEDIN

### Template P1 : Tip (1200×1200)

| Slot | Max caractères |
|------|----------------|
| H1 (Tip #X) | 30 |
| Conseil | 100 |
| Explication | 150 |

---

### Template P2 : Mythe vs Réalité (1200×1200)

| Slot | Max caractères |
|------|----------------|
| "MYTHE" | 60 |
| "RÉALITÉ" | 80 |

---

### Template P3 : Checklist (1200×1200)

| Slot | Max caractères |
|------|----------------|
| H1 | 40 |
| Items (×5) | 40 chacun |

---

### Template P4 : Mini-Case (1200×627)

| Slot | Max caractères |
|------|----------------|
| Client/Contexte | 30 |
| Problème | 60 |
| Solution | 60 |
| Résultat | 40 |

---

## RÈGLES GLOBALES TEMPLATES

### Alternance Thèmes (Carrousels)

| Slide | Thème recommandé |
|-------|------------------|
| 1 (Hook) | Dark |
| 2 (Problème) | Light |
| 3 (Insight) | Dark |
| 4 (Preuve) | Terra |
| 5+ (CTA) | Dark |

### Verrouillages

- **Tailles typo** : Non modifiables par l'utilisateur
- **Marges** : Safe zones forcées
- **Arc** : Placement automatique selon template
- **Palette** : Tokens uniquement

### Preview Obligatoire

Avant export, simulation :
- Affichage mobile (375px)
- Compression LinkedIn (~70%)
- Contraste post-compression

---

*Pack Templates LinkedIn — IArche Design System v4.2*
