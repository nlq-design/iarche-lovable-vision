import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  FolderKanban, 
  FileText, 
  Bell, 
  User,
  Users,
  Lightbulb,
  LogOut,
  FileAudio,
  Clock,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePartnerAuth } from '@/hooks/partner/usePartnerAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const menuItems = [
  {
    title: 'Tableau de bord',
    url: '/espace-partenaire',
    icon: LayoutDashboard,
  },
  {
    title: 'Mes Missions',
    url: '/espace-partenaire/missions',
    icon: FolderKanban,
  },
  {
    title: 'Documents',
    url: '/espace-partenaire/documents',
    icon: FileText,
  },
  {
    title: 'Leads',
    url: '/espace-partenaire/leads',
    icon: Users,
  },
  {
    title: 'Solutions',
    url: '/espace-partenaire/solutions',
    icon: Lightbulb,
  },
  {
    title: 'Transcriptions',
    url: '/espace-partenaire/transcriptions',
    icon: FileAudio,
  },
  {
    title: 'Suivi du temps',
    url: '/espace-partenaire/temps',
    icon: Clock,
  },
  {
    title: 'Mon Activité',
    url: '/espace-partenaire/activite',
    icon: Activity,
  },
  {
    title: 'Annonces',
    url: '/espace-partenaire/annonces',
    icon: Bell,
  },
  {
    title: 'Mon Profil',
    url: '/espace-partenaire/profil',
    icon: User,
  },
];

export function PartnerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { partnerData } = usePartnerAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold text-lg">
              {partnerData?.name?.charAt(0) || 'P'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">
              {partnerData?.name || 'Partenaire'}
            </h2>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {partnerData?.partner_type?.replace('_', ' ') || 'Partenaire'}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== '/espace-partenaire' && location.pathname.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <a href={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
