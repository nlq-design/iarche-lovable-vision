import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAuth } from '@/hooks/cockpit/useCockpitAuth';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedVivierRouteProps {
  children: ReactNode;
}

/**
 * Accès Viviers : authentification + rôle cockpit suffisent.
 * Pas de 2FA / step-up MFA distinct (la session auth standard fait foi).
 */
const ProtectedVivierRoute = ({ children }: ProtectedVivierRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasCockpitAccess, loading: cockpitLoading } = useCockpitAuth();
  const location = useLocation();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (authLoading || cockpitLoading || !user) return;
    setDenied(!hasCockpitAccess);
  }, [authLoading, cockpitLoading, user, hasCockpitAccess]);

  if (authLoading || cockpitLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vérification des accès Viviers...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShieldX className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Accès non autorisé</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder aux Viviers.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.history.back()} variant="outline">
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedVivierRoute;
