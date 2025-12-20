import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from 'lucide-react';

export type VerticalAlignment = 'top' | 'center' | 'bottom';

interface VerticalAlignmentControlsProps {
  value: VerticalAlignment;
  onChange: (value: VerticalAlignment) => void;
  label?: string;
  className?: string;
}

export const VerticalAlignmentControls = ({ 
  value, 
  onChange, 
  label = 'Alignement vertical',
  className = ''
}: VerticalAlignmentControlsProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(v) => v && onChange(v as VerticalAlignment)}
        className="justify-start"
      >
        <ToggleGroupItem value="top" aria-label="Haut" className="gap-2">
          <AlignVerticalJustifyStart className="h-4 w-4" />
          <span className="text-xs">Haut</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Centre" className="gap-2">
          <AlignVerticalJustifyCenter className="h-4 w-4" />
          <span className="text-xs">Centre</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="bottom" aria-label="Bas" className="gap-2">
          <AlignVerticalJustifyEnd className="h-4 w-4" />
          <span className="text-xs">Bas</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

// Helper function to convert vertical alignment to CSS justify-content
export const getJustifyContent = (alignment: VerticalAlignment): string => {
  switch (alignment) {
    case 'top':
      return 'flex-start';
    case 'bottom':
      return 'flex-end';
    case 'center':
    default:
      return 'center';
  }
};

// Helper for Tailwind classes
export const getJustifyClass = (alignment: VerticalAlignment): string => {
  switch (alignment) {
    case 'top':
      return 'justify-start';
    case 'bottom':
      return 'justify-end';
    case 'center':
    default:
      return 'justify-center';
  }
};

export default VerticalAlignmentControls;
