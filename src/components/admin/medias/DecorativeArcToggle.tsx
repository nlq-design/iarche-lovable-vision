import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DecorativeArcToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  compact?: boolean;
}

export const DecorativeArcToggle = ({ 
  enabled, 
  onChange, 
  compact = false 
}: DecorativeArcToggleProps) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Switch
          id="decorative-arc"
          checked={enabled}
          onCheckedChange={onChange}
          className="scale-90"
        />
        <Label htmlFor="decorative-arc" className="text-xs cursor-pointer">
          Arcs décoratifs
        </Label>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Arcs décoratifs</Label>
      <div className="flex items-center gap-3">
        <Switch
          id="decorative-arc"
          checked={enabled}
          onCheckedChange={onChange}
        />
        <Label htmlFor="decorative-arc" className="text-sm text-muted-foreground cursor-pointer">
          {enabled ? "Visibles dans l'export" : "Masqués"}
        </Label>
      </div>
    </div>
  );
};
