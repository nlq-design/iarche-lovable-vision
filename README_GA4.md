# Configuration Google Analytics 4

## Étape 1 : Créer une propriété GA4

1. Allez sur [Google Analytics](https://analytics.google.com/)
2. Créez une nouvelle propriété GA4
3. Copiez votre **Measurement ID** (format : `G-XXXXXXXXXX`)

## Étape 2 : Configurer le Measurement ID

Ouvrez le fichier `src/components/utils/GoogleAnalytics.tsx` et remplacez :

```typescript
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // TODO: Remplacer par votre ID
```

Par votre vrai Measurement ID :

```typescript
const GA4_MEASUREMENT_ID = 'G-ABC123DEF4'; // Votre ID GA4
```

## Étape 3 : Vérifier le fonctionnement

1. Déployez votre site
2. Ouvrez Google Analytics → Rapports → Temps réel
3. Naviguez sur votre site
4. Vérifiez que les pages vues s'affichent en temps réel

## Événements trackés automatiquement

### 📊 Page Views
- Toutes les navigations entre pages
- Titre de page et URL capturés

### 📝 Formulaires
- **Contact Form** : soumission réussie/échouée
- **Newsletter Signup (Homepage)** : inscription depuis la homepage
- **Newsletter Signup (Page)** : inscription depuis /newsletter

### 🎯 CTAs (à venir)
Utilisez la fonction `trackCTAClick()` pour tracker les clics sur les CTA :

```typescript
import { trackCTAClick } from '@/components/utils/GoogleAnalytics';

trackCTAClick('Découvrir', '/services');
trackCTAClick('Nous contacter', '/contact');
```

## Confidentialité (RGPD)

✅ **Anonymisation des IPs activée** : les adresses IP des visiteurs sont anonymisées par défaut (`anonymizeIp: true`).

Assurez-vous de mentionner l'utilisation de Google Analytics dans votre politique de confidentialité (`/confidentialite`).

## Rapports disponibles dans GA4

- **Acquisition** : d'où viennent vos visiteurs
- **Engagement** : pages vues, temps passé
- **Conversions** : formulaires soumis
- **Temps réel** : visiteurs actuels

## Support

Documentation officielle : [Google Analytics 4](https://support.google.com/analytics/answer/10089681)
