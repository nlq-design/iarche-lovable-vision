import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type CharterType = 'iarche' | 'iarche2';

interface CharterSelectorProps {
  value: CharterType;
  onChange: (charter: CharterType) => void;
  label?: string;
}

// IArche I - Charte officielle
export const IARCHE_I_COLORS = {
  bleuNuit: '#1A2B4A',
  bleuNuitDark: '#14203A',
  terracotta: '#B04A32',
  blancCasse: '#FAF9F7',
  white: '#FFFFFF',
  whiteAlpha90: 'rgba(255, 255, 255, 0.9)',
  whiteAlpha70: 'rgba(255, 255, 255, 0.7)',
  whiteAlpha50: 'rgba(255, 255, 255, 0.5)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  grisTexte: '#4A5568',
} as const;

export const IARCHE_I_GRADIENTS = {
  diagonal: {
    css: `linear-gradient(135deg, ${IARCHE_I_COLORS.bleuNuit} 0%, ${IARCHE_I_COLORS.bleuNuitDark} 100%)`,
  },
  horizontal: {
    css: `linear-gradient(90deg, ${IARCHE_I_COLORS.bleuNuit} 0%, ${IARCHE_I_COLORS.bleuNuitDark} 100%)`,
  },
  vertical: {
    css: `linear-gradient(180deg, ${IARCHE_I_COLORS.bleuNuit} 0%, ${IARCHE_I_COLORS.bleuNuitDark} 100%)`,
  },
  darkSolid: {
    css: IARCHE_I_COLORS.bleuNuit,
  },
  lightSolid: {
    css: IARCHE_I_COLORS.blancCasse,
  },
} as const;

// IArche II - Charte alternative (Nicolas Lara)
export const IARCHE_II_COLORS = {
  bleuNuit: '#213A6B',           // Bleu Profond
  bleuNuitDark: '#1A2F58',
  terracotta: '#D4633A',         // Terracotta Chaleureux
  blancCasse: '#FAF9F7',
  white: '#FFFFFF',
  whiteAlpha90: 'rgba(255, 255, 255, 0.9)',
  whiteAlpha70: 'rgba(255, 255, 255, 0.7)',
  whiteAlpha50: 'rgba(255, 255, 255, 0.5)',
  whiteAlpha40: 'rgba(255, 255, 255, 0.4)',
  whiteAlpha20: 'rgba(255, 255, 255, 0.2)',
  grisTexte: '#4A5568',
} as const;

export const IARCHE_II_GRADIENTS = {
  diagonal: {
    css: `linear-gradient(135deg, ${IARCHE_II_COLORS.terracotta} 0%, ${IARCHE_II_COLORS.bleuNuit} 100%)`,
  },
  horizontal: {
    css: `linear-gradient(90deg, ${IARCHE_II_COLORS.terracotta} 0%, ${IARCHE_II_COLORS.bleuNuit} 100%)`,
  },
  vertical: {
    css: `linear-gradient(180deg, ${IARCHE_II_COLORS.terracotta} 0%, ${IARCHE_II_COLORS.bleuNuit} 100%)`,
  },
  darkSolid: {
    css: IARCHE_II_COLORS.bleuNuit,
  },
  lightSolid: {
    css: IARCHE_II_COLORS.blancCasse,
  },
} as const;

// Get colors based on charter
export const getCharterColors = (charter: CharterType) => {
  return charter === 'iarche2' ? IARCHE_II_COLORS : IARCHE_I_COLORS;
};

// Get gradients based on charter
export const getCharterGradients = (charter: CharterType) => {
  return charter === 'iarche2' ? IARCHE_II_GRADIENTS : IARCHE_I_GRADIENTS;
};

export type GradientType = keyof typeof IARCHE_I_GRADIENTS;

const CharterSelector: React.FC<CharterSelectorProps> = ({ value, onChange, label = "Charte graphique" }) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as CharterType)}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ 
                background: value === 'iarche2' 
                  ? `linear-gradient(135deg, ${IARCHE_II_COLORS.terracotta} 0%, ${IARCHE_II_COLORS.bleuNuit} 100%)`
                  : `linear-gradient(135deg, ${IARCHE_I_COLORS.bleuNuit} 0%, ${IARCHE_I_COLORS.terracotta} 100%)`
              }}
            />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="iarche">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ background: `linear-gradient(135deg, ${IARCHE_I_COLORS.bleuNuit} 0%, ${IARCHE_I_COLORS.terracotta} 100%)` }}
              />
              IArche I (Officielle)
            </div>
          </SelectItem>
          <SelectItem value="iarche2">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ background: `linear-gradient(135deg, ${IARCHE_II_COLORS.terracotta} 0%, ${IARCHE_II_COLORS.bleuNuit} 100%)` }}
              />
              IArche II (Alternative)
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default CharterSelector;
