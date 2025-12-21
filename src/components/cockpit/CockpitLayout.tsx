import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CockpitSidebar } from './CockpitSidebar';
import { CockpitHeader } from './CockpitHeader';

interface CockpitLayoutProps {
  children: ReactNode;
}

export function CockpitLayout({ children }: CockpitLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <CockpitSidebar />
        
        <div className="flex-1 flex flex-col">
          <CockpitHeader />
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
