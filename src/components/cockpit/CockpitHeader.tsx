import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAuth } from '@/hooks/cockpit/useCockpitAuth';
import { LogOut, Shield, Clock, Briefcase, Fish, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { EmailDraftsSheet } from './EmailDraftsSheet';

export function CockpitHeader() {
  const [emailDraftsOpen, setEmailDraftsOpen] = useState(false);

  // Fetch pending email drafts count
  const { data: pendingDraftsCount = 0 } = useQuery({
    queryKey: ['email-drafts-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('activity_log')
        .select('id', { count: 'exact', head: true })
        .eq('activity_type', 'email_draft_generated')
        .or('metadata->>draft_status.is.null,metadata->>draft_status.eq.pending_review');
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000, // Refresh every minute
  });
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
      <div className="h-full px-3 sm:px-6 flex items-center justify-between">
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
          {/* Email Drafts Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setEmailDraftsOpen(true)}
                className="h-8 px-3 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary relative"
              >
                <Mail className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Brouillons</span>
                {pendingDraftsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingDraftsCount > 9 ? '9+' : pendingDraftsCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {pendingDraftsCount > 0 
                ? `${pendingDraftsCount} brouillon${pendingDraftsCount > 1 ? 's' : ''} en attente`
                : "Brouillons d'emails IA"
              }
            </TooltipContent>
          </Tooltip>

          {/* Viviers Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/viviers')}
                className="h-8 px-3 border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
              >
                <Fish className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Viviers</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gérer les leads froids</TooltipContent>
          </Tooltip>

          <EmailDraftsSheet open={emailDraftsOpen} onOpenChange={setEmailDraftsOpen} />

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
