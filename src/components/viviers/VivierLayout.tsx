import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { VivierSidebar } from './VivierSidebar';
import { VivierHeader } from './VivierHeader';

interface VivierLayoutProps {
  children: ReactNode;
}

export function VivierLayout({ children }: VivierLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <VivierSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <VivierHeader />
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
