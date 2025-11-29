import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { runConsistencyTests, validateSupabaseFilter, getMappingFromPublicRoute, getMappingFromAdminRoute } from '@/utils/verifyResourceTypeConsistency';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Composant de développement uniquement
 * Vérifie la cohérence des resource_type au runtime et affiche des alertes
 */
export function ResourceTypeValidator() {
  const location = useLocation();
  const [validationResult, setValidationResult] = useState<ReturnType<typeof runConsistencyTests> | null>(null);
  const [showValidator, setShowValidator] = useState(false);

  useEffect(() => {
    // Uniquement en développement
    if (import.meta.env.DEV) {
      const result = runConsistencyTests();
      setValidationResult(result);

      // Afficher dans la console
      if (result.valid) {
        console.log('✅ Resource Type Consistency: All checks passed');
      } else {
        console.error('❌ Resource Type Consistency: Issues detected');
        result.errors.forEach(error => console.error(error));
        result.warnings.forEach(warning => console.warn(warning));
      }

      // Vérifier la route actuelle
      const currentPath = location.pathname;
      let currentMapping = null;

      if (currentPath.startsWith('/admin/')) {
        currentMapping = getMappingFromAdminRoute(currentPath);
        if (currentMapping) {
          console.log(`📍 Admin Route: ${currentMapping.adminRoute} → resource_type='${currentMapping.resourceType}'`);
        }
      } else if (!currentPath.startsWith('/admin')) {
        currentMapping = getMappingFromPublicRoute(currentPath);
        if (currentMapping) {
          console.log(`📍 Public Route: ${currentMapping.publicRoute} → resource_type='${currentMapping.resourceType}'`);
        }
      }
    }
  }, [location.pathname]);

  // N'affiche rien en production
  if (!import.meta.env.DEV) {
    return null;
  }

  // Toggle avec raccourci clavier (Ctrl+Shift+V)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        setShowValidator(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!showValidator || !validationResult) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowValidator(true)}
          className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-mono hover:bg-primary/90 transition-colors"
          title="Afficher le validateur de resource_type (Ctrl+Shift+V)"
        >
          🔍 Dev: Resource Types
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto">
      <Alert variant={validationResult.valid ? "default" : "destructive"} className="shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {validationResult.valid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle className="font-mono text-sm">
              Resource Type Validator
            </AlertTitle>
          </div>
          <button
            onClick={() => setShowValidator(false)}
            className="text-xs hover:underline"
          >
            Fermer
          </button>
        </div>
        
        <AlertDescription className="mt-4 space-y-2">
          {validationResult.valid ? (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✅ Tous les tests de cohérence sont passés
            </p>
          ) : (
            <>
              {validationResult.errors.map((error, idx) => (
                <p key={`error-${idx}`} className="text-xs text-destructive">
                  {error}
                </p>
              ))}
            </>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {validationResult.warnings.map((warning, idx) => (
                <p key={`warning-${idx}`} className="text-xs text-yellow-600 dark:text-yellow-400">
                  {warning}
                </p>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
            <p>Route actuelle: <code className="font-mono bg-muted px-1 py-0.5 rounded">{location.pathname}</code></p>
            <p className="mt-1">Raccourci: <kbd className="font-mono bg-muted px-1 py-0.5 rounded">Ctrl+Shift+V</kbd></p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
