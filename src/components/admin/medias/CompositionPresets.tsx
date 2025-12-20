import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { VerticalAlignment } from './VerticalAlignmentControls';
import { Layout, LayoutTemplate, Layers, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from 'lucide-react';

export interface CompositionPreset {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  verticalAlignment: VerticalAlignment;
  paddingTop?: number; // pourcentage
  paddingBottom?: number;
  contentGap?: number;
}

// Presets de composition prédéfinis
export const COMPOSITION_PRESETS: CompositionPreset[] = [
  {
    id: 'title-top',
    label: 'Titre en haut',
    description: 'Contenu principal en haut, espace libre en bas',
    icon: <AlignVerticalJustifyStart className="h-5 w-5" />,
    verticalAlignment: 'top',
    paddingTop: 15,
    paddingBottom: 25,
    contentGap: 24,
  },
  {
    id: 'centered',
    label: 'Centré',
    description: 'Contenu équilibré au centre',
    icon: <AlignVerticalJustifyCenter className="h-5 w-5" />,
    verticalAlignment: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    contentGap: 32,
  },
  {
    id: 'title-bottom',
    label: 'Titre en bas',
    description: 'Espace libre en haut, contenu en bas',
    icon: <AlignVerticalJustifyEnd className="h-5 w-5" />,
    verticalAlignment: 'bottom',
    paddingTop: 25,
    paddingBottom: 15,
    contentGap: 24,
  },
  {
    id: 'hero-impact',
    label: 'Impact Hero',
    description: 'Titre haut avec grand espace central',
    icon: <Layout className="h-5 w-5" />,
    verticalAlignment: 'top',
    paddingTop: 10,
    paddingBottom: 30,
    contentGap: 48,
  },
  {
    id: 'cta-focused',
    label: 'Focus CTA',
    description: 'CTA en bas bien visible',
    icon: <Layers className="h-5 w-5" />,
    verticalAlignment: 'bottom',
    paddingTop: 30,
    paddingBottom: 10,
    contentGap: 40,
  },
  {
    id: 'balanced',
    label: 'Équilibré',
    description: 'Distribution uniforme du contenu',
    icon: <LayoutTemplate className="h-5 w-5" />,
    verticalAlignment: 'center',
    paddingTop: 15,
    paddingBottom: 15,
    contentGap: 28,
  },
];

interface CompositionPresetsProps {
  selectedPreset: string;
  onSelectPreset: (preset: CompositionPreset) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

export const CompositionPresets = ({
  selectedPreset,
  onSelectPreset,
  label = 'Presets de composition',
  className = '',
  compact = false,
}: CompositionPresetsProps) => {
  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMPOSITION_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant={selectedPreset === preset.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectPreset(preset)}
              className="h-8 px-2.5 gap-1.5"
              title={preset.description}
            >
              {preset.icon}
              <span className="text-xs">{preset.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {COMPOSITION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
              selectedPreset === preset.id 
                ? 'border-accent bg-accent/10' 
                : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="text-muted-foreground mt-0.5">
              {preset.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{preset.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {preset.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CompositionPresets;
