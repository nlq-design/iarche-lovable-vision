import { Home, BarChart3, Sparkles, FileText, FolderOpen, Tag, MessageCircle, Users, Mail, Send, Shield, Settings, Database } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  {
    group: 'Vue d\'ensemble',
    items: [
      { title: 'Tableau de bord', url: '/admin', icon: Home, exact: true },
      { title: 'Statistiques', url: '/admin/dashboard', icon: BarChart3 },
      { title: 'Stats avancées', url: '/admin/advanced-stats', icon: BarChart3 },
    ]
  },
  {
    group: 'Contenu',
    items: [
      { title: 'Articles (fond)', url: '/admin/articles', icon: FileText },
      { title: 'Actualités', url: '/admin/actualites', icon: FileText },
      { title: 'Cas clients', url: '/admin/cas-clients', icon: FileText },
      { title: 'Solutions', url: '/admin/solutions', icon: FileText },
      { title: 'Livres blancs', url: '/admin/livres-blancs', icon: FileText },
      { title: 'Ateliers & Webinaires', url: '/admin/ateliers-webinaires', icon: FileText },
      { title: 'Redacia (IA)', url: '/admin/redacia', icon: Sparkles },
    ]
  },
  {
    group: 'Organisation',
    items: [
      { title: 'Catégories', url: '/admin/categories', icon: FolderOpen },
      { title: 'Tags', url: '/admin/tags', icon: Tag },
    ]
  },
  {
    group: 'Engagement',
    items: [
      { title: 'Commentaires', url: '/admin/comments', icon: MessageCircle },
    ]
  },
  {
    group: 'Communication',
    items: [
      { title: 'Abonnés', url: '/admin/newsletters', icon: Users },
      { title: 'RedacNews', url: '/admin/redacnews', icon: Send },
    ]
  },
  {
    group: 'Sécurité',
    items: [
      { title: 'Dashboard sécurité', url: '/admin/security-dashboard', icon: Shield },
      { title: 'Logs d\'audit', url: '/admin/audit-logs', icon: Shield },
      { title: 'Backups', url: '/admin/backups', icon: Database },
      { title: 'Paramètres de sécurité', url: '/admin/settings', icon: Settings },
    ]
  }
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const isCollapsed = state === 'collapsed';

  const isActive = (url: string, exact?: boolean) => {
    if (exact) {
      return currentPath === url;
    }
    return currentPath.startsWith(url);
  };

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="pt-4">
        {navigationItems.map((section) => {
          const hasActiveItem = section.items.some((item) => isActive(item.url, item.exact));
          
          return (
            <SidebarGroup
              key={section.group}
              className="mb-2"
            >
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                  {section.group}
                </SidebarGroupLabel>
              )}
              
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => {
                    const active = isActive(item.url, item.exact);
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.exact ? true : undefined}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                            activeClassName="bg-primary/10 text-primary font-medium"
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {!isCollapsed && <span className="text-sm">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
