import { VIVIER_ENGAGEMENT_COLORS, VivierEngagementLevel } from '@/lib/colorCodes';
import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';

/**
 * Legend component showing all vivier engagement colors
 */
export function VivierEngagementLegend() {
  const levels = Object.entries(VIVIER_ENGAGEMENT_COLORS) as [VivierEngagementLevel, typeof VIVIER_ENGAGEMENT_COLORS[VivierEngagementLevel]][];

  // Sort by level number
  levels.sort((a, b) => a[1].level - b[1].level);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Info className="h-3.5 w-3.5" />
          Légende couleurs
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-foreground mb-3">Engagement campagnes</h4>
          <div className="grid gap-1.5">
            {levels.map(([key, config]) => (
              <div 
                key={key} 
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md ${config.bgClass} ${config.borderClass} border`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${config.textClass}`}>
                  {config.level}
                </div>
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
