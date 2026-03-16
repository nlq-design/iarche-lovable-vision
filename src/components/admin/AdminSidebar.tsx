import { 
  Home, 
  BarChart3, 
  Sparkles, 
  FileText, 
  FolderOpen, 
  Tag, 
  MessageCircle, 
  Users, 
  Mail, 
  Send, 
  Shield, 
  Settings, 
  Database, 
  HelpCircle, 
  Activity, 
  MousePointerClick, 
  UserCheck, 
  ImageIcon, 
  ClipboardList, 
  CalendarCheck, 
  BookOpen,
  Newspaper,
  Building2,
  Calendar,
  Rocket,
  FileDown,
  Gauge,
  Bot,
  Server
} from 'lucide-react';
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
    group: 'Commercial',
    items: [
      { title: 'Cockpit Commercial', url: '/cockpit', icon: Gauge, highlight: true },
    ]
  },
  {
    group: 'Vue d\'ensemble',
    items: [
      { title: 'Tableau de bord', url: '/admin', icon: Home, exact: true },
      { title: 'Stats avancées', url: '/admin/advanced-stats', icon: BarChart3 },
      { title: 'Performance', url: '/admin/performance-monitoring', icon: Activity },
      { title: 'Analytics CTAs', url: '/admin/cta-analytics', icon: MousePointerClick },
    ]
  },
  {
    group: 'Contenu',
    items: [
      { title: 'Articles', url: '/admin/articles', icon: FileText },
      { title: 'Actualités', url: '/admin/actualites', icon: Newspaper },
      { title: 'Cas clients', url: '/admin/cas-clients', icon: Building2 },
      { title: 'Livres blancs', url: '/admin/livres-blancs', icon: BookOpen },
      { title: 'Ateliers & Webinaires', url: '/admin/ateliers-webinaires', icon: Calendar },
      { title: 'Solutions', url: '/admin/solutions', icon: Rocket },
      { title: 'FAQs', url: '/admin/faqs', icon: HelpCircle },
      { title: 'Brochures', url: '/admin/brochures', icon: FileDown },
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
      { title: 'Leads (consolidé)', url: '/admin/leads', icon: Users },
      { title: 'Rendez-vous', url: '/admin/rendez-vous', icon: CalendarCheck },
      { title: 'Contacts', url: '/admin/contacts', icon: Mail },
      { title: 'Inscriptions Livres blancs', url: '/admin/livre-blanc-inscriptions', icon: BookOpen },
      { title: 'Inscriptions Ateliers', url: '/admin/atelier-inscriptions', icon: UserCheck },
      { title: 'Commentaires', url: '/admin/comments', icon: MessageCircle },
      { title: 'Formulaires', url: '/admin/formulaires', icon: ClipboardList },
      { title: 'Réponses formulaires', url: '/admin/form-responses', icon: ClipboardList },
      { title: 'IArche Labs', url: '/admin/iarche-labs', icon: Rocket },
    ]
  },
  {
    group: 'Communication',
    items: [
      { title: 'Abonnés Newsletter', url: '/admin/newsletters', icon: Users },
      { title: 'RedacNews', url: '/admin/redacnews', icon: Send },
      { title: 'Gestion Emails', url: '/admin/emails', icon: Mail },
      { title: 'Médias', url: '/admin/medias', icon: ImageIcon },
    ]
  },
  {
    group: 'Sécurité & IA',
    items: [
      { title: 'Prompts IA', url: '/admin/ai-prompts', icon: Bot },
      { title: 'Bibliothèque API', url: '/admin/api-library', icon: Server },
      { title: 'Dashboard sécurité', url: '/admin/security-dashboard', icon: Shield },
      { title: 'Logs d\'audit', url: '/admin/audit-logs', icon: Shield },
      { title: 'Backups', url: '/admin/backups', icon: Database },
      { title: 'Paramètres', url: '/admin/settings', icon: Settings },
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
              className="mb-1"
            >
              {!isCollapsed && (
                <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1">
                  {section.group}
                </SidebarGroupLabel>
              )}
              
              <SidebarGroupContent>
                <SidebarMenu>
                {section.items.map((item) => {
                    const active = isActive(item.url, item.exact);
                    const isHighlight = 'highlight' in item && item.highlight;
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.exact ? true : undefined}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                              isHighlight 
                                ? 'bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border border-primary/20' 
                                : 'hover:bg-muted/50'
                            }`}
                            activeClassName="bg-primary/10 text-primary font-medium"
                          >
                            <item.icon className={`h-4 w-4 flex-shrink-0 ${isHighlight ? 'text-primary' : ''}`} />
                            {!isCollapsed && (
                              <span className={`text-sm ${isHighlight ? 'font-medium text-primary' : ''}`}>
                                {item.title}
                              </span>
                            )}
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
