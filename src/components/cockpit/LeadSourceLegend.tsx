import { LEAD_SOURCE_COLORS, LeadSource } from '@/lib/colorCodes';
import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';

/**
 * Legend component showing all lead source colors for the Cockpit module
 */
export function LeadSourceLegend() {
  const sources = Object.entries(LEAD_SOURCE_COLORS) as [LeadSource, typeof LEAD_SOURCE_COLORS[LeadSource]][];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Info className="h-3.5 w-3.5" />
          Légende couleurs
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-foreground mb-3">Sources des leads</h4>
          <div className="grid gap-1.5">
            {sources.map(([key, config]) => (
              <div 
                key={key} 
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md ${config.bgClass} ${config.borderClass} border`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${config.indicatorClass} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${config.textClass}`}>{config.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{config.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
