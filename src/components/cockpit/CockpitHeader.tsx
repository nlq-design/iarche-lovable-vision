import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAuth } from '@/hooks/cockpit/useCockpitAuth';
import { LogOut, Shield, Clock, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function CockpitHeader() {
  const { user, signOut } = useAuth();
  const { stepUpExpiresAt, hasCockpitAdminAccess } = useCockpitAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "Erreur", description: "Impossible de se déconnecter", variant: "destructive" });
    } else {
      navigate('/admin');
    }
  };

  const sessionTimeRemaining = stepUpExpiresAt 
    ? formatDistanceToNow(stepUpExpiresAt, { locale: fr, addSuffix: false })
    : null;

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40 h-14">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="lg:hidden" />
          <Link to="/cockpit" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-base text-foreground">Cockpit</span>
              {hasCockpitAdminAccess && (
                <Badge variant="secondary" className="ml-2 text-xs font-medium">Admin</Badge>
              )}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {sessionTimeRemaining && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md border">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline font-medium">{sessionTimeRemaining}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Session sécurisée expire dans {sessionTimeRemaining}
              </TooltipContent>
            </Tooltip>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden md:inline">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-8 px-2.5">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Déconnexion</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
