import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { PartnerNotificationBell } from './PartnerNotificationBell';

export function PartnerHeader() {
  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Espace Partenaire</span>
          <Badge variant="secondary" className="text-xs">
            IArche
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <PartnerNotificationBell />
      </div>
    </header>
  );
}
