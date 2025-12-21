import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  Calendar, 
  FolderKanban, 
  FileText, 
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  {
    group: 'Vue d\'ensemble',
    items: [
      { title: 'Dashboard', url: '/cockpit', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'Commercial',
    items: [
      { title: 'Pipeline', url: '/cockpit/pipeline', icon: GitBranch },
      { title: 'Leads qualifiés', url: '/cockpit/leads', icon: Users },
      { title: 'Agenda', url: '/cockpit/agenda', icon: Calendar },
    ]
  },
  {
    group: 'Projets',
    items: [
      { title: 'Projets', url: '/cockpit/projects', icon: FolderKanban },
    ]
  },
  {
    group: 'Catalogue',
    items: [
      { title: 'Solutions', url: '/cockpit/solutions', icon: FileText },
    ]
  },
  {
    group: 'Analyse',
    items: [
      { title: 'Analytics', url: '/cockpit/analytics', icon: BarChart3 },
    ]
  }
];

export function CockpitSidebar() {
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
        {navigationItems.map((section) => (
          <SidebarGroup key={section.group} className="mb-1">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground px-3 mb-1">
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
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
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
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t">
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
            <ArrowLeft className="h-4 w-4" />
            {!isCollapsed && <span>Retour Admin</span>}
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
