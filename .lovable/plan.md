

## Améliorations Signature Email IArche v5

### Problemes actuels
- Logo petit (28px preview, 32px HTML) et utilise le SVG local au lieu du PNG hébergé
- Design basique : pas d'icônes contact, pas de séparateur visuel soigné
- Tagline mal alignée (commence sous le logo au lieu de couvrir toute la largeur)
- Pas de lien LinkedIn / réseaux sociaux
- Le téléphone par défaut est vide

### Améliorations proposées

**1. Logo plus grand et net**
- Passer le logo de 32px à 48px en hauteur dans le HTML et le preview
- Centrer verticalement le logo par rapport au bloc texte

**2. Structure visuelle améliorée**
- Ajouter des icones email/phone/web en texte Unicode (✉ ☎ 🌐) pour compatibilité email-safe (pas de SVG inline)
- Ligne séparatrice fine (1px, couleur `bleuNuitLight`) entre les infos contact et la tagline
- Tagline alignée à gauche sous toute la signature (colspan=2), avec un petit trait terracotta décoratif

**3. Champ LinkedIn optionnel**
- Nouveau champ dans le formulaire : "LinkedIn (optionnel)"
- Affiche un lien `in/pseudo` dans la signature si renseigné

**4. Meilleure hiérarchie typographique**
- Nom : 17px bold, Bleu Nuit
- Fonction : 13px regular, gris #555
- Contact (email/tel/site) : 13px, espacement uniforme
- Tagline : 11px italic, gris #999, précédée d'un tiret em "—"

**5. Preview fidèle au HTML**
- Synchroniser les tailles/couleurs entre le preview React et le `generateHTML()` pour un rendu WYSIWYG

### Fichier modifié
- `src/pages/admin/SignatureEditor.tsx` : formulaire (ajout champ LinkedIn), preview React, et `generateHTML()`

### Rendu attendu

```text
┌──────────────────────────────────────────────┐
│  [LOGO 48px]  │  Nicolas LARA QUERALTA       │
│               │  CEO & Fondateur · IArche     │
│               │                               │
│               │  ✉ nlq@iarche.fr              │
│               │  ☎ +33 6 00 00 00 00          │
│               │  🔗 iarche.fr                  │
│               │  in linkedin.com/in/nlq       │
│───────────────┴───────────────────────────────│
│  — L'IA se construit avec vous                │
└──────────────────────────────────────────────┘
```

