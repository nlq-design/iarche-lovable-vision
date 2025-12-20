# IArche — Système de Score Qualité Médias
## Algorithme & Seuils d'Export

> **Objectif** : Garantir qu'aucun visuel "amateur" ne puisse sortir de l'outil.  
> **Seuil d'export** : Score ≥ 80/100

---

## 1. STRUCTURE DU SCORE (100 points)

| Critère | Poids | Ce qu'il mesure |
|---------|-------|-----------------|
| **Contraste** | 30% | Lisibilité WCAG |
| **Safe Zones** | 20% | Respiration visuelle |
| **Densité** | 20% | Charge cognitive |
| **Hiérarchie** | 15% | Clarté de lecture |
| **Palette** | 15% | Cohérence brand |

---

## 2. CONTRASTE (30 points)

### Tests Exacts

| Test | Condition | Points |
|------|-----------|--------|
| Texte normal (< 24px) | Ratio ≥ 4.5:1 | +15 |
| Gros texte (≥ 24px ou bold) | Ratio ≥ 3:1 | +10 |
| Éléments UI (icônes, bordures) | Ratio ≥ 3:1 | +5 |

### Pénalités

| Violation | Pénalité | Bloquant |
|-----------|----------|----------|
| Ratio texte normal < 4.5:1 | -15 | ✅ OUI |
| Ratio gros texte < 3:1 | -10 | ✅ OUI |
| Alpha texte < 0.6 | -10 | Non |

### Calcul Ratio Contraste

```
ratio = (L1 + 0.05) / (L2 + 0.05)
où L1 = luminance relative plus claire
   L2 = luminance relative plus foncée
```

### Valeurs de Référence IArche

| Combinaison | Ratio | Statut |
|-------------|-------|--------|
| #FFFFFF sur #1A2B4A | 12.5:1 | ✅ Excellent |
| #FAF9F7 sur #1A2B4A | 11.8:1 | ✅ Excellent |
| #FAF9F7 sur #B04A32 | 4.8:1 | ✅ AA |
| #1A2B4A sur #FAF9F7 | 11.8:1 | ✅ Excellent |
| rgba(255,255,255,0.8) sur #1A2B4A | ~8.5:1 | ✅ Bon |
| rgba(250,249,247,0.88) sur #B04A32 | ~4.2:1 | ✅ AA |
| rgba(255,255,255,0.6) sur #B04A32 | ~3.2:1 | ⚠️ Limite |

---

## 3. SAFE ZONES (20 points)

### Tests Exacts

| Test | Condition | Points |
|------|-----------|--------|
| Aucun élément dans safe zone | Respecté | +20 |
| Collision partielle (< 25% surface) | | -10 |
| Collision majeure (≥ 25% surface) | | -20 |

### Seuils par Format

| Format | Safe Zone | Collision = |
|--------|-----------|-------------|
| Carrousel 1080×1350 | 64px | Si élément à < 64px du bord |
| Banner 1584×396 | 48px H / 32px V | Si élément à < 48px/32px |
| Post 1200×1200 | 80px | Si élément à < 80px |
| Story 1080×1920 | 80px | Si élément à < 80px |

### Pénalités

| Violation | Pénalité | Bloquant |
|-----------|----------|----------|
| Élément touche safe zone | -10 | Non |
| Élément dépasse safe zone | -20 | ✅ OUI |

---

## 4. DENSITÉ (20 points)

### Tests Exacts — Texte

| Test | Seuil | Points si OK |
|------|-------|--------------|
| Caractères par slide (carrousel) | ≤ 320 | +8 |
| Caractères par visuel (post) | ≤ 250 | +8 |
| Caractères par banner | ≤ 120 | +8 |
| Blocs texte par zone | ≤ 2 | +6 |

### Tests Exacts — Éléments

| Test | Seuil | Points si OK |
|------|-------|--------------|
| Éléments visuels par slide | ≤ 3 | +6 |
| Icônes par bloc | ≤ 1 | +3 |
| Icônes par slide | ≤ 3 | +3 |

### Pénalités

| Violation | Pénalité |
|-----------|----------|
| Caractères +20% au-dessus du seuil | -5 |
| Caractères +50% au-dessus du seuil | -10 |
| Blocs texte > 3 | -8 |
| Éléments visuels > 5 | -10 |

### Action Automatique

Si densité texte dépasse le seuil :
1. **Warning** affiché
2. **Auto-shrink** proposé (réduction typo progressive)
3. Score maintenu si l'utilisateur accepte l'ajustement

---

## 5. HIÉRARCHIE (15 points)

### Tests Exacts — Ratios Typographiques

| Test | Condition | Points |
|------|-----------|--------|
| Ratio H1 / Body | ≥ 2.2 | +6 |
| Ratio H2 / Body | ≥ 1.4 | +4 |
| Ratio H1 / H2 | ≥ 1.3 | +3 |
| Un seul H1 par slide/zone | Respecté | +2 |

### Pénalités

| Violation | Pénalité |
|-----------|----------|
| H1 trop petit (ratio < 2.0) | -8 |
| H2 trop petit (ratio < 1.3) | -5 |
| Plusieurs H1 au même niveau | -5 |
| Pas de hiérarchie visible | -10 |

### Calcul Ratio

```
ratio = fontSize_niveau_sup / fontSize_niveau_inf

Exemple :
  H1 = 40px, Body = 16px
  ratio = 40/16 = 2.5 ✅
```

---

## 6. PALETTE (15 points)

### Tests Exacts

| Test | Condition | Points |
|------|-----------|--------|
| Toutes couleurs dans tokens | 100% | +10 |
| Max 1 accent (Terracotta) par zone | Respecté | +3 |
| Pas de gris hors palette | Respecté | +2 |

### Couleurs Autorisées (Tokens)

```javascript
const VALID_COLORS = [
  '#1A2B4A',  // bleuNuit
  '#14203A',  // bleuNuitDark
  '#B04A32',  // terracotta
  '#8C3A28',  // terracottaDark
  '#FAF9F7',  // blancCasse
  '#FFFFFF',  // white
  '#2D2D2D',  // foreground
  '#666666',  // subtle
  '#6B7280',  // muted
  '#F5F3EF',  // secondary
  '#E8E4DD',  // border
  '#0D1520',  // contrastDark
];

const VALID_ALPHA = [
  'rgba(255, 255, 255, 0.8)',
  'rgba(255, 255, 255, 0.6)',
  'rgba(255, 255, 255, 0.4)',
  'rgba(255, 255, 255, 0.2)',
  'rgba(250, 249, 247, 0.88)',
  'rgba(26, 43, 74, 0.1)',
  'rgba(26, 43, 74, 0.2)',
  'rgba(176, 74, 50, 0.2)',
  'rgba(176, 74, 50, 0.3)',
];
```

### Pénalités

| Violation | Pénalité | Bloquant |
|-----------|----------|----------|
| Couleur hors tokens | -15 | ✅ OUI |
| 2+ accents Terracotta même zone | -5 | Non |
| Gris non-brand (#888, #AAA) | -10 | Non |

---

## 7. CRITÈRES PERCEPTIFS (Bonus/Malus)

### Rythme Visuel (+5 / -5)

| Condition | Effet |
|-----------|-------|
| Espacement régulier entre blocs | +3 |
| Zone de respiration ≥ 20% surface | +2 |
| Blocs collés sans espacement | -5 |

### Équilibre Composition (+3 / -3)

| Condition | Effet |
|-----------|-------|
| Répartition équilibrée (rule of thirds) | +3 |
| Tout entassé dans un coin | -3 |

---

## 8. SEUILS D'EXPORT

### Tableau des Seuils

| Score | Statut | Action |
|-------|--------|--------|
| 90-100 | 🟢 Excellent | Export autorisé |
| 80-89 | 🟡 Bon | Export autorisé + suggestions |
| 60-79 | 🟠 Insuffisant | Export **bloqué** + recommandations |
| 0-59 | 🔴 Critique | Export **bloqué** + erreurs listées |

### Blocages Absolus (Indépendant du Score)

Ces violations bloquent l'export même si le score total est ≥ 80 :

| Violation | Message |
|-----------|---------|
| Contraste texte < 4.5:1 | "Contraste insuffisant : texte illisible" |
| Élément hors safe zone | "Élément trop proche du bord : risque de rognage" |
| Couleur hors palette | "Couleur non autorisée : utiliser les tokens" |
| Arc + Logo en header | "Combinaison interdite : retirer l'arc du header" |

---

## 9. RECOMMANDATIONS CONTEXTUELLES

### Messages par Critère

**Contraste**
- "Titre trop clair sur fond clair → passer en Bleu Nuit"
- "Sous-texte illisible sur Terra → utiliser #FAF9F7"

**Safe Zones**
- "Logo trop proche du bord → décaler de Xpx"
- "Texte déborde de la safe zone → réduire ou repositionner"

**Densité**
- "Trop de texte (X caractères) → limiter à 320"
- "Trop d'éléments (X) → simplifier à 3 max"

**Hiérarchie**
- "Titre trop petit → augmenter à Xpx minimum"
- "Pas de hiérarchie claire → différencier H1/H2/Body"

**Palette**
- "Couleur #XXX non autorisée → remplacer par [suggestion]"
- "Trop d'accents Terracotta → garder 1 seul"

---

## 10. IMPLÉMENTATION UI

### Indicateur Temps Réel

```
┌─────────────────────────────────────┐
│  Score Qualité                      │
│  ████████████░░░░ 78/100            │
│  🟠 Insuffisant                     │
│                                     │
│  ⚠️ 2 problèmes à corriger :        │
│  • Contraste sous-texte trop faible │
│  • Safe zone non respectée (logo)   │
│                                     │
│  [Voir détails] [Corriger auto]     │
└─────────────────────────────────────┘
```

### Détail par Critère

```
Contraste      ████████░░ 24/30  ⚠️
Safe Zones     ██████████ 20/20  ✅
Densité        ████████░░ 16/20  ⚠️
Hiérarchie     ██████████ 15/15  ✅
Palette        ██████████ 15/15  ✅
─────────────────────────────────────
TOTAL                    90/100  🟢
```

### Bouton Export

| État | Apparence |
|------|-----------|
| Score ≥ 80, pas de blocage | `[Exporter PNG]` actif |
| Score < 80 | `[Exporter PNG]` grisé + tooltip |
| Blocage absolu | `[Exporter PNG]` rouge + message |

---

## 11. PREVIEW MOBILE (Obligatoire)

Avant tout export LinkedIn, afficher une simulation :
- Ratio compression LinkedIn (~70% qualité)
- Affichage mobile (375px largeur simulée)
- Contraste post-compression

**Si lisibilité compromise après simulation** → Warning supplémentaire

---

*Spécification technique Quality Score — IArche Design System v4.2*
