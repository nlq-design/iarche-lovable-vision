import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { AgentChat } from '@/components/cockpit/AgentChat';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, signOut } = useAuth();
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header Admin */}
          <header className="bg-background border-b border-border sticky top-0 z-40 h-16">
            <div className="h-full px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
                <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                    <span className="text-white font-bold text-sm">IA</span>
                  </div>
                  <span className="font-semibold text-lg">Back-office</span>
                </Link>
              </div>

              <div className="flex items-center gap-4">
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Retour au site</span>
                </Link>
                <NotificationBell />
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

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
        
        {/* Agent IA flottant */}
        <AgentChat />
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
