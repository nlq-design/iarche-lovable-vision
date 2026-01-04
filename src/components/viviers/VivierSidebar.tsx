import { Link, useLocation } from 'react-router-dom';
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
  Upload, 
  Users, 
  Mail, 
  Settings,
  Fish,
  Sparkles,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LogoArc from '@/components/ui/LogoArc';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/viviers',
  },
  {
    title: 'Tous les leads',
    icon: Users,
    href: '/viviers/leads',
  },
  {
    title: 'Import',
    icon: Upload,
    href: '/viviers/import',
  },
  {
    title: 'Scoring IA',
    icon: Target,
    href: '/viviers/scoring',
  },
  {
    title: 'Campagnes',
    icon: Mail,
    href: '/viviers/campaigns',
  },
];

const settingsItems = [
  {
    title: 'Paramètres',
    icon: Settings,
    href: '/viviers/settings',
  },
];

export function VivierSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        <Link to="/viviers" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <Fish className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">Viviers</h2>
            <p className="text-xs text-muted-foreground">Leads froids</p>
          </div>
        </Link>
        <div className="mt-3">
          <LogoArc size="sm" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/viviers' && location.pathname.startsWith(item.href));
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors',
                          isActive 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className={cn('w-4 h-4', isActive && 'text-primary')} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-4">
            Configuration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location.pathname === item.href;
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors',
                          isActive 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className={cn('w-4 h-4', isActive && 'text-primary')} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>Instantly + IA</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
