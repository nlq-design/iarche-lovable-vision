# Schema.org Validation Script

## 📋 Vue d'ensemble

Script de validation automatique des schemas Schema.org JSON-LD dans le projet IArche.

## 🚀 Usage

### Validation manuelle
```bash
node scripts/validate-schemas.js
```

### Validation avant commit (recommandé)
Ajouter dans `.husky/pre-commit` ou `package.json`:
```json
{
  "scripts": {
    "validate:schemas": "node scripts/validate-schemas.js",
    "precommit": "npm run validate:schemas"
  }
}
```

### Validation dans CI/CD
Ajouter dans `.github/workflows/main.yml`:
```yaml
- name: Validate Schema.org markup
  run: node scripts/validate-schemas.js
```

## 🔍 Ce qui est vérifié

### Erreurs bloquantes (❌)
- Propriétés obligatoires manquantes par type de schema
- `@type` manquant ou invalide
- Propriétés critiques pour l'indexation Google
- VideoObject sans contentUrl/embedUrl

### Avertissements (⚠️)
- Image manquante sur Article (recommandé pour rich results)
- Offers manquant sur Event
- Review manquant sur Organization avec aggregateRating
- Types de schemas non reconnus

## 📚 Types de schemas validés

| Type | Propriétés obligatoires | Usage |
|------|------------------------|-------|
| `Article` | headline, author, publisher, datePublished | Articles, actualités, cas clients |
| `Organization` | name, url | Homepage, contact |
| `LocalBusiness` | name, address | Page contact |
| `Event` | name, startDate, location | Ateliers & webinaires |
| `Book` | name, author | Livres blancs |
| `VideoObject` | name, thumbnailUrl, uploadDate | Replays ateliers |
| `FAQPage` | mainEntity | Articles avec FAQ |
| `BreadcrumbList` | itemListElement | Toutes les pages |
| `Service` | name, provider | Page services |
| `Review` | author, reviewRating | Livre d'Or |
| `ItemList` | itemListElement | Listes de services |

## 🎯 Exemples de sortie

### ✅ Succès
```
🔍 Scanning for Schema.org markup...

📄 src/pages/Index.tsx
  Found 2 schema(s)

📄 src/pages/ArticleDetail.tsx
  Found 4 schema(s)

============================================================
📊 SCHEMA VALIDATION REPORT
============================================================

✓ Total schemas validated: 12

✓ No errors found!

============================================================

✓ Validation PASSED
```

### ❌ Échec
```
============================================================
📊 SCHEMA VALIDATION REPORT
============================================================

✓ Total schemas validated: 8

❌ ERRORS (2):

1. src/pages/ArticleDetail.tsx:186
   Missing required properties for Article: publisher

2. src/pages/Services.tsx:94
   Missing @type property

⚠️  WARNINGS (1):

1. src/pages/Index.tsx:42
   Article should have an image for better rich results

============================================================

❌ Validation FAILED
```

## 🔧 Configuration

### Ajouter un nouveau type de schema

Éditer `REQUIRED_PROPERTIES` dans `validate-schemas.js`:

```javascript
const REQUIRED_PROPERTIES = {
  // ... types existants
  MonNouveauType: ['@type', 'name', 'proprieteRequise']
};
```

### Validations spécifiques par type

Ajouter un cas dans `validateByType()`:

```javascript
case 'MonNouveauType':
  if (!schema.proprieteRecommandee) {
    this.warnings.push({
      file: filePath,
      line: lineNumber,
      message: 'MonNouveauType devrait avoir proprieteRecommandee'
    });
  }
  break;
```

## 📖 Ressources

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Documentation](https://schema.org/)
- [Google Search Central - Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

## ⚙️ Limites actuelles

Le script effectue une analyse **statique** du code source:
- Ne valide pas les schemas générés dynamiquement au runtime
- N'exécute pas le code React/TypeScript
- Heuristique simple pour l'extraction (peut manquer certains schemas complexes)

Pour une validation **runtime complète**, utiliser:
1. Google Rich Results Test (URL ou code HTML complet)
2. Validation manuelle dans les DevTools (rechercher `application/ld+json`)

## 🔄 Améliorations futures

- [ ] Parser TypeScript/TSX avec Babel pour extraction précise
- [ ] Validation des URLs (format, existence)
- [ ] Validation des dates ISO 8601
- [ ] Vérification des images (existence, dimensions)
- [ ] Export des résultats en JSON pour CI/CD
- [ ] Intégration avec Google Search Console API
