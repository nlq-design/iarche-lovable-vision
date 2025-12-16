import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BarSize } from './html/tokens';

export type ExportMode = 'simple' | 'with-bar' | 'full';

interface ExportModeControlsProps {
  exportMode: ExportMode;
  onExportModeChange: (mode: ExportMode) => void;
  barSize?: BarSize;
  onBarSizeChange?: (size: BarSize) => void;
  showBarSizeSelector?: boolean;
  compact?: boolean;
}

const EXPORT_MODES: { value: ExportMode; label: string; description: string }[] = [
  { value: 'simple', label: 'Simple', description: 'Contenu uniquement' },
  { value: 'with-bar', label: '+ Barre', description: 'Avec barre décorative' },
  { value: 'full', label: 'Complet', description: 'Tous les éléments visuels' },
];

const BAR_SIZES: BarSize[] = ['sm', 'md', 'lg', 'xl'];

export const ExportModeControls: React.FC<ExportModeControlsProps> = ({
  exportMode,
  onExportModeChange,
  barSize,
  onBarSizeChange,
  showBarSizeSelector = true,
  compact = false,
}) => {
  const showBarSize = showBarSizeSelector && barSize && onBarSizeChange && (exportMode === 'with-bar' || exportMode === 'full');

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Mode :</Label>
          <RadioGroup
            value={exportMode}
            onValueChange={(v) => onExportModeChange(v as ExportMode)}
            className="flex gap-2"
          >
            {EXPORT_MODES.map((mode) => (
              <div key={mode.value} className="flex items-center space-x-1">
                <RadioGroupItem value={mode.value} id={`mode-${mode.value}`} className="h-3 w-3" />
                <Label htmlFor={`mode-${mode.value}`} className="text-xs cursor-pointer">
                  {mode.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {showBarSize && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Barre :</Label>
            <div className="flex gap-1">
              {BAR_SIZES.map((size) => (
                <Button
                  key={size}
                  variant={barSize === size ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onBarSizeChange?.(size)}
                >
                  {size.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Mode d'export</Label>
        <RadioGroup
          value={exportMode}
          onValueChange={(v) => onExportModeChange(v as ExportMode)}
          className="grid grid-cols-3 gap-2"
        >
          {EXPORT_MODES.map((mode) => (
            <div key={mode.value} className="flex items-center space-x-2">
              <RadioGroupItem value={mode.value} id={`mode-${mode.value}`} />
              <Label htmlFor={`mode-${mode.value}`} className="cursor-pointer">
                <span className="text-sm font-medium">{mode.label}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {showBarSize && (
        <div className="space-y-2">
          <Label>Taille de barre</Label>
          <div className="flex gap-2">
            {BAR_SIZES.map((size) => (
              <Button
                key={size}
                variant={barSize === size ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => onBarSizeChange?.(size)}
              >
                {size.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportModeControls;
