import React from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type TextAlignment = 'left' | 'center' | 'right';

interface TypographyControlsProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  isBold: boolean;
  onBoldChange: (bold: boolean) => void;
  isItalic: boolean;
  onItalicChange: (italic: boolean) => void;
  alignment: TextAlignment;
  onAlignmentChange: (alignment: TextAlignment) => void;
  minFontSize?: number;
  maxFontSize?: number;
  label?: string;
}

export default function TypographyControls({
  fontSize,
  onFontSizeChange,
  isBold,
  onBoldChange,
  isItalic,
  onItalicChange,
  alignment,
  onAlignmentChange,
  minFontSize = 16,
  maxFontSize = 72,
  label = 'Typographie',
}: TypographyControlsProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <Label className="text-sm font-medium">{label}</Label>
      
      {/* Font Size Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Taille</span>
          <span className="text-xs font-medium">{fontSize}px</span>
        </div>
        <Slider
          value={[fontSize]}
          onValueChange={([value]) => onFontSizeChange(value)}
          min={minFontSize}
          max={maxFontSize}
          step={1}
          className="w-full"
        />
      </div>

      {/* Style Toggles */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Style</span>
        <Toggle
          pressed={isBold}
          onPressedChange={onBoldChange}
          size="sm"
          aria-label="Gras"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={isItalic}
          onPressedChange={onItalicChange}
          size="sm"
          aria-label="Italique"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-2">Alignement</span>
        <ToggleGroup
          type="single"
          value={alignment}
          onValueChange={(value) => value && onAlignmentChange(value as TextAlignment)}
          className="justify-start"
        >
          <ToggleGroupItem value="left" size="sm" aria-label="Aligner à gauche">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" size="sm" aria-label="Centrer">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" size="sm" aria-label="Aligner à droite">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
