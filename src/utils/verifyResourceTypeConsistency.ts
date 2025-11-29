/**
 * Script de vérification de la cohérence des resource_type
 * Vérifie que les filtres sont correctement appliqués entre pages publiques et admin
 */

export interface ResourceTypeMapping {
  publicRoute: string;
  adminRoute: string;
  createRoute: string;
  editRoute: string;
  resourceType: string;
  publicPageFile: string;
  adminPageFile: string;
}

/**
 * Configuration canonique des mappings resource_type
 * C'est la source de vérité pour toute l'architecture
 */
export const RESOURCE_TYPE_MAPPINGS: ResourceTypeMapping[] = [
  {
    publicRoute: '/articles',
    adminRoute: '/admin/articles',
    createRoute: '/admin/articles/new',
    editRoute: '/admin/articles/:id',
    resourceType: 'article',
    publicPageFile: 'src/pages/Articles.tsx',
    adminPageFile: 'src/pages/admin/AdminArticles.tsx',
  },
  {
    publicRoute: '/actualites',
    adminRoute: '/admin/actualites',
    createRoute: '/admin/actualites/new',
    editRoute: '/admin/actualites/:id',
    resourceType: 'actualite',
    publicPageFile: 'src/pages/Actualites.tsx',
    adminPageFile: 'src/pages/admin/AdminActualites.tsx',
  },
  {
    publicRoute: '/cas-clients',
    adminRoute: '/admin/cas-clients',
    createRoute: '/admin/cas-clients/new',
    editRoute: '/admin/cas-clients/:id',
    resourceType: 'cas-client',
    publicPageFile: 'src/pages/CasClients.tsx',
    adminPageFile: 'src/pages/admin/AdminCasClients.tsx',
  },
  {
    publicRoute: '/livres-blancs',
    adminRoute: '/admin/livres-blancs',
    createRoute: '/admin/livres-blancs/new',
    editRoute: '/admin/livres-blancs/:id',
    resourceType: 'livre-blanc',
    publicPageFile: 'src/pages/LivresBlancs.tsx',
    adminPageFile: 'src/pages/admin/AdminLivresBlancs.tsx',
  },
  {
    publicRoute: '/ateliers-webinaires',
    adminRoute: '/admin/ateliers-webinaires',
    createRoute: '/admin/ateliers-webinaires/new',
    editRoute: '/admin/ateliers-webinaires/:id',
    resourceType: 'atelier-webinaire',
    publicPageFile: 'src/pages/AteliersWebinaires.tsx',
    adminPageFile: 'src/pages/admin/AdminAteliersWebinaires.tsx',
  },
];

/**
 * Vérifie qu'un resource_type est valide
 */
export function isValidResourceType(type: string): boolean {
  return RESOURCE_TYPE_MAPPINGS.some(mapping => mapping.resourceType === type);
}

/**
 * Obtient le mapping pour un resource_type donné
 */
export function getMappingForResourceType(type: string): ResourceTypeMapping | undefined {
  return RESOURCE_TYPE_MAPPINGS.find(mapping => mapping.resourceType === type);
}

/**
 * Obtient le mapping depuis une route publique
 */
export function getMappingFromPublicRoute(route: string): ResourceTypeMapping | undefined {
  return RESOURCE_TYPE_MAPPINGS.find(mapping => route.startsWith(mapping.publicRoute));
}

/**
 * Obtient le mapping depuis une route admin
 */
export function getMappingFromAdminRoute(route: string): ResourceTypeMapping | undefined {
  return RESOURCE_TYPE_MAPPINGS.find(mapping => route.startsWith(mapping.adminRoute));
}

/**
 * Valide qu'un filtre Supabase utilise le bon resource_type
 */
export function validateSupabaseFilter(
  pageType: 'public' | 'admin',
  route: string,
  filterValue: string
): { valid: boolean; expected: string; actual: string } {
  const mapping = pageType === 'public' 
    ? getMappingFromPublicRoute(route)
    : getMappingFromAdminRoute(route);

  if (!mapping) {
    return { valid: false, expected: 'unknown', actual: filterValue };
  }

  return {
    valid: mapping.resourceType === filterValue,
    expected: mapping.resourceType,
    actual: filterValue,
  };
}

/**
 * Génère une URL publique depuis un resource_type et un slug
 */
export function getPublicUrlFromResourceType(resourceType: string, slug: string): string {
  const mapping = getMappingForResourceType(resourceType);
  return mapping ? `${mapping.publicRoute}/${slug}` : `/actualites/${slug}`;
}

/**
 * Génère une route admin depuis un resource_type
 */
export function getAdminRouteFromResourceType(resourceType: string): string {
  const mapping = getMappingForResourceType(resourceType);
  return mapping ? mapping.adminRoute : '/admin/actualites';
}

/**
 * Hook de développement pour vérifier la cohérence au runtime
 * À utiliser uniquement en développement
 */
export function useResourceTypeConsistencyCheck() {
  if (import.meta.env.DEV) {
    console.group('🔍 Resource Type Consistency Check');
    console.table(RESOURCE_TYPE_MAPPINGS.map(m => ({
      'Type': m.resourceType,
      'Public': m.publicRoute,
      'Admin': m.adminRoute,
      'Create': m.createRoute,
    })));
    console.groupEnd();
  }
}

/**
 * Fonction de test pour valider la cohérence complète
 * Retourne un rapport de validation
 */
export function runConsistencyTests(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifier que tous les resource_types sont uniques
  const types = RESOURCE_TYPE_MAPPINGS.map(m => m.resourceType);
  const uniqueTypes = new Set(types);
  if (types.length !== uniqueTypes.size) {
    errors.push('❌ Des resource_types en double ont été détectés');
  }

  // Vérifier que toutes les routes publiques sont uniques
  const publicRoutes = RESOURCE_TYPE_MAPPINGS.map(m => m.publicRoute);
  const uniquePublicRoutes = new Set(publicRoutes);
  if (publicRoutes.length !== uniquePublicRoutes.size) {
    errors.push('❌ Des routes publiques en double ont été détectées');
  }

  // Vérifier que toutes les routes admin sont uniques
  const adminRoutes = RESOURCE_TYPE_MAPPINGS.map(m => m.adminRoute);
  const uniqueAdminRoutes = new Set(adminRoutes);
  if (adminRoutes.length !== uniqueAdminRoutes.size) {
    errors.push('❌ Des routes admin en double ont été détectées');
  }

  // Vérifier la cohérence des noms de fichiers
  RESOURCE_TYPE_MAPPINGS.forEach(mapping => {
    if (!mapping.publicPageFile.includes('.tsx')) {
      warnings.push(`⚠️ Le fichier public pour ${mapping.resourceType} n'a pas l'extension .tsx`);
    }
    if (!mapping.adminPageFile.includes('.tsx')) {
      warnings.push(`⚠️ Le fichier admin pour ${mapping.resourceType} n'a pas l'extension .tsx`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
