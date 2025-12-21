import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAuth } from '@/hooks/cockpit/useCockpitAuth';
import { LogOut, Shield, Clock, Sparkles } from 'lucide-react';
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
    <header className="bg-background border-b border-border sticky top-0 z-40 h-16">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="lg:hidden" />
          <Link to="/cockpit" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-semibold text-lg">Cockpit Commercial</span>
              {hasCockpitAdminAccess && (
                <Badge variant="secondary" className="ml-2 text-xs">Admin</Badge>
              )}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Session indicator */}
          {sessionTimeRemaining && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                  <Shield className="w-4 h-4 text-green-500" />
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">{sessionTimeRemaining}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Session sécurisée expire dans {sessionTimeRemaining}
              </TooltipContent>
            </Tooltip>
          )}

          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
