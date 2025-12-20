import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

interface TopMarginSliderProps {
  value: number; // pourcentage 0-50
  onChange: (value: number) => void;
  label?: string;
  className?: string;
  min?: number;
  max?: number;
}

export const TopMarginSlider = ({ 
  value, 
  onChange, 
  label = 'Marge supérieure',
  className = '',
  min = 0,
  max = 50,
}: TopMarginSliderProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const val = Math.max(min, Math.min(max, Number(e.target.value)));
              onChange(val);
            }}
            className="w-16 h-7 text-xs text-center"
            min={min}
            max={max}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={1}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground">
        Décalage vertical du contenu depuis le haut
      </p>
    </div>
  );
};

// Helper to get padding-top style value
export const getTopMarginStyle = (percentage: number): string => {
  return `${percentage}%`;
};

// Helper to ensure minimum spacing from header (prevents content touching logo/header)
export const getContentSpacing = (topMargin: number, minSpacing: number = 5): number => {
  return Math.max(topMargin, minSpacing);
};

export default TopMarginSlider;
