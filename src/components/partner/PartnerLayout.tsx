import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { PartnerSidebar } from './PartnerSidebar';
import { PartnerHeader } from './PartnerHeader';

interface PartnerLayoutProps {
  children: ReactNode;
}

export function PartnerLayout({ children }: PartnerLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PartnerSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <PartnerHeader />
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
