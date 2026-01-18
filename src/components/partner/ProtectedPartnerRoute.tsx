import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePartnerAuth } from '@/hooks/partner/usePartnerAuth';
import { Loader2, ShieldX, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedPartnerRouteProps {
  children: ReactNode;
}

type AccessDeniedReason = 'NOT_LOGGED_IN' | 'NOT_PARTNER' | 'NO_PROFILE';

const ProtectedPartnerRoute = ({ children }: ProtectedPartnerRouteProps) => {
  const { user, isPartner, partnerId, loading } = usePartnerAuth();
  const location = useLocation();
  const [deniedReason, setDeniedReason] = useState<AccessDeniedReason | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setDeniedReason('NOT_LOGGED_IN');
      return;
    }

    if (!isPartner) {
      setDeniedReason('NOT_PARTNER');
      return;
    }

    if (!partnerId) {
      setDeniedReason('NO_PROFILE');
      return;
    }

    setDeniedReason(null);
  }, [loading, user, isPartner, partnerId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Vérification de votre accès partenaire...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (deniedReason === 'NOT_LOGGED_IN') {
    return <Navigate to="/admin" state={{ from: location, partnerAccess: true }} replace />;
  }

  // Not a partner
  if (deniedReason === 'NOT_PARTNER') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <ShieldX className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Accès non autorisé</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder à l'Espace Partenaire.
              Contactez votre administrateur si vous pensez qu'il s'agit d'une erreur.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button onClick={() => window.location.href = '/'} variant="outline">
              Accueil
            </Button>
            <Button onClick={() => window.history.back()}>
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No partner profile linked
  if (deniedReason === 'NO_PROFILE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <UserX className="h-12 w-12 text-warning mx-auto mb-2" />
            <CardTitle>Profil partenaire introuvable</CardTitle>
            <CardDescription>
              Votre compte est bien partenaire mais aucun profil n'est associé.
              Veuillez contacter l'équipe IArche pour finaliser la configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button onClick={() => window.location.href = '/contact'} variant="outline">
              Nous contacter
            </Button>
            <Button onClick={() => window.history.back()}>
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed
  return <>{children}</>;
};

export default ProtectedPartnerRoute;
