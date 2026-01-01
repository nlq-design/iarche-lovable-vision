import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  Calendar, 
  FolderKanban, 
  BarChart3,
  ArrowLeft,
  Package,
  Mic,
  FileText,
  Upload,
  Bot,
  Handshake
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navigationItems = [
  { title: 'Dashboard', url: '/cockpit', icon: LayoutDashboard, exact: true },
  { title: 'Pipeline', url: '/cockpit/pipeline', icon: GitBranch },
  { title: 'Leads', url: '/cockpit/leads', icon: Users },
  { title: 'Projets', url: '/cockpit/projects', icon: FolderKanban },
  { title: 'Solutions', url: '/cockpit/solutions', icon: Package },
  { title: 'Partenaires', url: '/cockpit/partenaires', icon: Handshake },
  { title: 'Documents', url: '/cockpit/upload', icon: Upload },
  { title: 'Devis/CDC', url: '/cockpit/documents', icon: FileText },
  { title: 'Transcriptions', url: '/cockpit/transcriptions', icon: Mic },
  { title: 'Agenda', url: '/cockpit/agenda', icon: Calendar },
  { title: 'Analytics', url: '/cockpit/analytics', icon: BarChart3 },
  { title: 'Agent IA', url: '/cockpit/chatbot', icon: Bot },
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
    <Sidebar className={isCollapsed ? 'w-14' : 'w-52'} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="pt-2 px-2">
        <SidebarMenu className="space-y-0.5">
          {navigationItems.map((item) => {
            const active = isActive(item.url, item.exact);
            
            const linkContent = (
              <NavLink
                to={item.url}
                end={item.exact ? true : undefined}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors text-sm ${
                  active 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
                activeClassName=""
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.title}</span>}
              </NavLink>
            );
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild className="p-0">
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <Link to="/admin">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            {!isCollapsed && <span>Admin</span>}
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
