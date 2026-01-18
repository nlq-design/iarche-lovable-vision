import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [isPartner, setIsPartner] = useState<boolean | null>(null);
  const [checkingPartner, setCheckingPartner] = useState(false);

  // Check if user is a partner when they're logged in but not admin
  useEffect(() => {
    async function checkPartnerRole() {
      if (!user || isAdmin || loading) return;
      
      setCheckingPartner(true);
      try {
        const { data: hasPartnerRole } = await supabase.rpc('is_partner_user');
        setIsPartner(!!hasPartnerRole);
      } catch (err) {
        console.error('Error checking partner role:', err);
        setIsPartner(false);
      } finally {
        setCheckingPartner(false);
      }
    }
    
    checkPartnerRole();
  }, [user, isAdmin, loading]);

  // Only redirect unauthenticated users to the admin login.
  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || checkingPartner) {
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
    return null;
  }

  // Partner user trying to access admin - show friendly redirect
  if (!isAdmin && isPartner) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center px-6">
        <Card className="max-w-md bg-background/95 border-border">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Espace Partenaire</CardTitle>
            <CardDescription>
              Vous êtes connecté en tant que partenaire. Accédez à votre espace dédié pour consulter vos missions et documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate('/espace-partenaire')} className="w-full">
              Accéder à l'Espace Partenaire
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-admin, non-partner user
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

