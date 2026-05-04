import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProtectedSuperAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedSuperAdminRoute = ({ children }: ProtectedSuperAdminRouteProps) => {
  const { user, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: location } });
      return;
    }
    if (!isSuperAdmin) {
      toast.error('Accès super-admin requis');
      navigate('/cockpit', { replace: true });
    }
  }, [user, isSuperAdmin, loading, navigate, location]);

  if (loading || !user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Vérification des accès super-admin...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedSuperAdminRoute;
