import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // Only redirect unauthenticated users to the admin login.
  // For authenticated-but-non-admin users, we avoid redirecting to /admin
  // to reduce admin route enumeration/UX loops.
  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect handled above
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-6">
        <Card className="max-w-md bg-background/95 border-border">
          <CardHeader>
            <CardTitle className="text-destructive">Accès refusé</CardTitle>
            <CardDescription>
              Vous n'avez pas les permissions nécessaires pour accéder au back-office.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;

