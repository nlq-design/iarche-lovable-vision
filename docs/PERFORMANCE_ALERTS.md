# Système d'alertes performance automatiques

## Vue d'ensemble

Le système de monitoring performance d'IArche inclut un système d'alertes email automatiques qui se déclenche lorsque les métriques de performance descendent sous des seuils critiques.

## Seuils configurés

### Scores Lighthouse (0-100)
- **Performance** : Alerte si < 85 (critique si < 70)
- **Accessibilité** : Alerte si < 90
- **Best Practices** : Alerte si < 90
- **SEO** : Alerte si < 95

### Core Web Vitals
- **LCP (Largest Contentful Paint)** : Alerte si > 2.5s (critique si > 4.0s)
- **FCP (First Contentful Paint)** : Alerte si > 1.8s
- **TTI (Time to Interactive)** : Alerte si > 3.8s
- **CLS (Cumulative Layout Shift)** : Alerte si > 0.1 (critique si > 0.25)
- **TBT (Total Blocking Time)** : Alerte si > 200ms

### Bundle Size
- **Bundle Total** : Alerte si > 500 KB (critique si > 700 KB)

## Fonctionnement

### 1. Enregistrement des métriques

Lorsqu'une métrique de performance est ajoutée via `/admin/performance-monitoring`, le système :

1. Enregistre la métrique dans la table `performance_metrics`
2. Appelle automatiquement l'Edge Function `check-performance-threshold`
3. Compare chaque valeur aux seuils configurés
4. Envoie un email d'alerte si des violations sont détectées

### 2. Niveau de sévérité

Les violations sont classées en deux niveaux :

- **⚠️ Warning (Avertissement)** : Métrique hors seuil mais pas critique
- **🔴 Critical (Critique)** : Métrique largement hors seuil, intervention urgente requise

### 3. Contenu de l'email

L'email d'alerte contient :
- **Résumé** : Nombre de violations (critiques + warnings)
- **Tableau des violations** : Métrique, valeur actuelle, seuil dépassé
- **Actions recommandées** : Suggestions contextuelles basées sur les violations détectées
- **Métadonnées** : Environnement (production/staging/local), date d'enregistrement

### 4. Destinataires

Email envoyé à : `nlq@iarche.fr` (admin IArche)

## Architecture technique

### Edge Function : `check-performance-threshold`

**Fichier** : `supabase/functions/check-performance-threshold/index.ts`

**Authentification** : Requiert JWT admin (`verify_jwt = true`)

**Processus** :
1. Vérifie l'authentification et le rôle admin
2. Reçoit les métriques en POST body
3. Compare chaque métrique aux seuils définis
4. Génère un email HTML formaté si violations détectées
5. Envoie l'email via Resend API
6. Retourne le résultat (violations, niveau de sévérité, ID email)

**Variables d'environnement requises** :
- `RESEND_API_KEY` : Clé API Resend pour l'envoi d'emails
- `SUPABASE_URL` : URL du projet Supabase
- `SUPABASE_ANON_KEY` : Clé anonyme Supabase

### Frontend : `PerformanceMonitoring.tsx`

**Route** : `/admin/performance-monitoring`

**Comportement après ajout de métrique** :
```typescript
// Insertion dans la DB
const { error } = await supabase
  .from('performance_metrics')
  .insert(metricData);

// Vérification des seuils
const { data: alertData } = await supabase.functions.invoke(
  'check-performance-threshold',
  { body: metricData }
);

// Toast notification si violations
if (alertData?.violations > 0) {
  toast({
    title: `⚠️ ${alertData.critical > 0 ? 'Alerte critique' : 'Avertissement'} performance`,
    description: `${alertData.violations} métrique(s) hors seuil. Email envoyé.`
  });
}
```

## Modifier les seuils

Pour ajuster les seuils d'alerte, éditer la constante `THRESHOLDS` dans :

**Fichier** : `supabase/functions/check-performance-threshold/index.ts`

```typescript
const THRESHOLDS = {
  performance_score: 85,        // Modifier ici
  accessibility_score: 90,
  best_practices_score: 90,
  seo_score: 95,
  lcp: 2.5,
  fcp: 1.8,
  tti: 3.8,
  cls: 0.1,
  tbt: 200,
  bundle_size_total: 500
};
```

**Important** : Après modification, redéployer l'Edge Function (automatique avec Lovable Cloud).

## Ajouter de nouveaux destinataires

Pour envoyer les alertes à plusieurs emails, éditer la ligne `to` dans l'appel Resend API :

```typescript
to: ["nlq@iarche.fr", "dev@iarche.fr", "admin@iarche.fr"]
```

## Désactiver les alertes

Pour désactiver temporairement les alertes sans supprimer le système :

### Option 1 : Côté frontend
Commenter l'appel à l'Edge Function dans `PerformanceMonitoring.tsx` :

```typescript
// try {
//   const { data: alertData } = await supabase.functions.invoke(
//     'check-performance-threshold',
//     { body: metricData }
//   );
// } catch (alertErr) {
//   console.error('Alert check failed:', alertErr);
// }
```

### Option 2 : Côté Edge Function
Retourner immédiatement sans vérification :

```typescript
const handler = async (req: Request): Promise<Response> => {
  // Alertes désactivées temporairement
  return new Response(
    JSON.stringify({ success: true, violations: 0, disabled: true }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
};
```

## Tests manuels

Pour tester le système d'alertes :

1. Aller sur `/admin/performance-monitoring`
2. Cliquer sur "Ajouter métrique"
3. Entrer des valeurs hors seuil :
   - Performance : 80 (< 85)
   - LCP : 3.0 (> 2.5s)
   - Bundle Total : 600 (> 500 KB)
4. Sélectionner environnement "Local" pour éviter fausses alertes prod
5. Soumettre le formulaire
6. Vérifier :
   - Toast notification dans l'interface
   - Email reçu à `nlq@iarche.fr`
   - Console logs dans Supabase Edge Function logs

## Logs & Debugging

### Voir les logs Edge Function

```bash
# Via Lovable Cloud UI
Admin → Performance → View Backend → Edge Functions → check-performance-threshold
```

### Exemples de logs

**Succès sans violation** :
```json
{
  "message": "Checking performance thresholds for:",
  "metric": { "performance_score": 92, "lcp": 1.8 }
}
{
  "message": "No threshold violations detected"
}
```

**Succès avec violations** :
```json
{
  "message": "Alert email sent successfully:",
  "emailId": "abc123-def456"
}
{
  "violations": 3,
  "critical": 1,
  "warnings": 2
}
```

**Erreur** :
```json
{
  "error": "Resend API error: Invalid API key"
}
```

## Intégration future

### Automatisation avec Lighthouse CI

Pour automatiser la capture de métriques après chaque déploiement :

1. Configurer Lighthouse CI dans le pipeline de déploiement
2. Extraire les résultats JSON
3. POST les métriques vers `/admin/performance-monitoring` via API
4. Les alertes se déclencheront automatiquement

### Webhooks Slack/Discord

Pour envoyer les alertes vers Slack/Discord en plus des emails :

1. Ajouter l'URL webhook en variable d'environnement
2. Dans `check-performance-threshold/index.ts`, après envoi email :

```typescript
// Envoi vers Slack
await fetch(SLACK_WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: `🚨 Alerte Performance: ${violations.length} métriques hors seuil`,
    attachments: [/* violations détaillées */]
  })
});
```

## Support

Pour toute question ou problème :
- Vérifier les logs Edge Function
- Tester manuellement avec des métriques hors seuil
- Vérifier que `RESEND_API_KEY` est configurée
- Contacter : nlq@iarche.fr
