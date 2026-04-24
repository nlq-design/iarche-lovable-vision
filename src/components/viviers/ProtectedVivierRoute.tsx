import { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAuth } from '@/hooks/cockpit/useCockpitAuth';
import { StepUpMfaDialog } from '@/components/cockpit/StepUpMfaDialog';
import { Loader2, ShieldAlert, ShieldX, KeyRound, Fish } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedVivierRouteProps {
  children: ReactNode;
}

type AccessDeniedReason = 'NO_ROLE' | 'MFA_NOT_ENABLED' | 'STEPUP_REQUIRED';

const ProtectedVivierRoute = ({ children }: ProtectedVivierRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { 
    hasCockpitAccess, 
    isStepUpVerified, 
    mfaEnabled, 
    loading: cockpitLoading,
    refreshStepUp 
  } = useCockpitAuth();
  const location = useLocation();
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [deniedReason, setDeniedReason] = useState<AccessDeniedReason | null>(null);

  useEffect(() => {
    if (authLoading || cockpitLoading) return;

    if (!user) return;

    // Viviers uses same access control as Cockpit
    if (!hasCockpitAccess) {
      setDeniedReason('NO_ROLE');
      return;
    }

    if (!mfaEnabled) {
      setDeniedReason('MFA_NOT_ENABLED');
      return;
    }

    if (!isStepUpVerified) {
      setDeniedReason('STEPUP_REQUIRED');
      setShowMfaDialog(true);
      return;
    }

    setDeniedReason(null);
  }, [authLoading, cockpitLoading, user, hasCockpitAccess, mfaEnabled, isStepUpVerified]);

  // Loading state
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

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Access denied - No cockpit role
  if (deniedReason === 'NO_ROLE') {
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

  // Access denied - MFA not enabled
  if (deniedReason === 'MFA_NOT_ENABLED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <KeyRound className="h-12 w-12 text-accent mx-auto mb-2" />
            <CardTitle>Authentification 2FA requise</CardTitle>
            <CardDescription>
              Vous devez activer la 2FA pour accéder aux Viviers. 
              Configurez-la dans les paramètres de sécurité.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Button onClick={() => window.history.back()} variant="outline">
              Retour
            </Button>
            <Button onClick={() => window.location.href = '/admin/settings'}>
              Paramètres
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step-up required - show dialog
  if (deniedReason === 'STEPUP_REQUIRED') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="relative mx-auto mb-2">
                <Fish className="h-12 w-12 text-primary" />
                <ShieldAlert className="h-5 w-5 text-accent absolute -bottom-1 -right-1" />
              </div>
              <CardTitle>Vérification requise</CardTitle>
              <CardDescription>
                Une vérification de sécurité est nécessaire pour accéder aux Viviers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button onClick={() => window.history.back()} variant="outline">
                Annuler
              </Button>
              <Button onClick={() => setShowMfaDialog(true)}>
                Vérifier
              </Button>
            </CardContent>
          </Card>
        </div>

        <StepUpMfaDialog
          open={showMfaDialog}
          onSuccess={() => {
            setShowMfaDialog(false);
            setDeniedReason(null);
            refreshStepUp();
          }}
          onCancel={() => {
            setShowMfaDialog(false);
            window.history.back();
          }}
        />
      </>
    );
  }

  // All checks passed
  return <>{children}</>;
};

export default ProtectedVivierRoute;
