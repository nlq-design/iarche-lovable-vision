#!/usr/bin/env node

/**
 * Script CLI pour vérifier la cohérence des resource_type
 * Usage: node scripts/verify-resource-types.js
 */

const fs = require('fs');
const path = require('path');

// Configuration canonique (doit être synchronisée avec verifyResourceTypeConsistency.ts)
const RESOURCE_TYPE_MAPPINGS = [
  {
    publicRoute: '/articles',
    adminRoute: '/admin/articles',
    resourceType: 'article',
    publicPageFile: 'src/pages/Articles.tsx',
    adminPageFile: 'src/pages/admin/AdminArticles.tsx',
  },
  {
    publicRoute: '/actualites',
    adminRoute: '/admin/actualites',
    resourceType: 'actualite',
    publicPageFile: 'src/pages/Actualites.tsx',
    adminPageFile: 'src/pages/admin/AdminActualites.tsx',
  },
  {
    publicRoute: '/cas-clients',
    adminRoute: '/admin/cas-clients',
    resourceType: 'cas-client',
    publicPageFile: 'src/pages/CasClients.tsx',
    adminPageFile: 'src/pages/admin/AdminCasClients.tsx',
  },
  {
    publicRoute: '/livres-blancs',
    adminRoute: '/admin/livres-blancs',
    resourceType: 'livre-blanc',
    publicPageFile: 'src/pages/LivresBlancs.tsx',
    adminPageFile: 'src/pages/admin/AdminLivresBlancs.tsx',
  },
  {
    publicRoute: '/ateliers-webinaires',
    adminRoute: '/admin/ateliers-webinaires',
    resourceType: 'atelier-webinaire',
    publicPageFile: 'src/pages/AteliersWebinaires.tsx',
    adminPageFile: 'src/pages/admin/AdminAteliersWebinaires.tsx',
  },
];

const errors = [];
const warnings = [];

console.log('\n🔍 Vérification de la cohérence des resource_type...\n');

// Vérifier l'unicité des resource_types
const types = RESOURCE_TYPE_MAPPINGS.map(m => m.resourceType);
const uniqueTypes = new Set(types);
if (types.length !== uniqueTypes.size) {
  errors.push('❌ Des resource_types en double ont été détectés');
}

// Vérifier l'unicité des routes
const publicRoutes = RESOURCE_TYPE_MAPPINGS.map(m => m.publicRoute);
const uniquePublicRoutes = new Set(publicRoutes);
if (publicRoutes.length !== uniquePublicRoutes.size) {
  errors.push('❌ Des routes publiques en double ont été détectées');
}

const adminRoutes = RESOURCE_TYPE_MAPPINGS.map(m => m.adminRoute);
const uniqueAdminRoutes = new Set(adminRoutes);
if (adminRoutes.length !== uniqueAdminRoutes.size) {
  errors.push('❌ Des routes admin en double ont été détectées');
}

// Vérifier l'existence des fichiers
RESOURCE_TYPE_MAPPINGS.forEach(mapping => {
  const publicFilePath = path.join(process.cwd(), mapping.publicPageFile);
  const adminFilePath = path.join(process.cwd(), mapping.adminPageFile);

  if (!fs.existsSync(publicFilePath)) {
    errors.push(`❌ Fichier manquant: ${mapping.publicPageFile}`);
  } else {
    // Vérifier le contenu du fichier public
    const content = fs.readFileSync(publicFilePath, 'utf-8');
    const filterPattern = new RegExp(`\\.eq\\(['"]resource_type['"],\\s*['"]${mapping.resourceType}['"]\\)`, 'g');
    const matches = content.match(filterPattern);
    
    if (!matches || matches.length === 0) {
      errors.push(`❌ ${mapping.publicPageFile}: Filtre .eq('resource_type', '${mapping.resourceType}') manquant ou incorrect`);
    } else if (matches.length < 2) {
      warnings.push(`⚠️ ${mapping.publicPageFile}: Seulement ${matches.length} filtre(s) trouvé(s), vérifiez les requêtes avec filtres`);
    }
  }

  if (!fs.existsSync(adminFilePath)) {
    errors.push(`❌ Fichier manquant: ${mapping.adminPageFile}`);
  } else {
    // Vérifier le contenu du fichier admin
    const content = fs.readFileSync(adminFilePath, 'utf-8');
    const filterPattern = new RegExp(`\\.eq\\(['"]resource_type['"],\\s*['"]${mapping.resourceType}['"]\\)`, 'g');
    const matches = content.match(filterPattern);
    
    if (!matches || matches.length === 0) {
      errors.push(`❌ ${mapping.adminPageFile}: Filtre .eq('resource_type', '${mapping.resourceType}') manquant ou incorrect`);
    }
  }
});

// Vérifier App.tsx pour les routes
const appTsxPath = path.join(process.cwd(), 'src/App.tsx');
if (fs.existsSync(appTsxPath)) {
  const appContent = fs.readFileSync(appTsxPath, 'utf-8');
  
  RESOURCE_TYPE_MAPPINGS.forEach(mapping => {
    // Vérifier route publique
    const publicRoutePattern = new RegExp(`path=["']${mapping.publicRoute}["']`);
    if (!publicRoutePattern.test(appContent)) {
      errors.push(`❌ Route publique manquante dans App.tsx: ${mapping.publicRoute}`);
    }
    
    // Vérifier routes admin
    const createRoutePattern = new RegExp(`path=["']${mapping.adminRoute}/new["']`);
    if (!createRoutePattern.test(appContent)) {
      warnings.push(`⚠️ Route de création manquante dans App.tsx: ${mapping.adminRoute}/new`);
    }
    
    const editRoutePattern = new RegExp(`path=["']${mapping.adminRoute}/:id["']`);
    if (!editRoutePattern.test(appContent)) {
      warnings.push(`⚠️ Route d'édition manquante dans App.tsx: ${mapping.adminRoute}/:id`);
    }
  });
} else {
  errors.push('❌ Fichier App.tsx introuvable');
}

// Afficher les résultats
console.log('📊 Résultats de la vérification:\n');
console.table(RESOURCE_TYPE_MAPPINGS.map(m => ({
  'Type': m.resourceType,
  'Route publique': m.publicRoute,
  'Route admin': m.adminRoute,
  'Fichier public': m.publicPageFile.split('/').pop(),
  'Fichier admin': m.adminPageFile.split('/').pop(),
})));

console.log('\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Tous les tests de cohérence sont passés!\n');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('🚨 ERREURS DÉTECTÉES:\n');
    errors.forEach(error => console.log(error));
    console.log('\n');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  AVERTISSEMENTS:\n');
    warnings.forEach(warning => console.log(warning));
    console.log('\n');
  }
  
  console.log(`❌ Tests échoués: ${errors.length} erreur(s), ${warnings.length} avertissement(s)\n`);
  process.exit(1);
}
