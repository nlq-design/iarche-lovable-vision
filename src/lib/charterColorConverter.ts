import { IARCHE_I_COLORS, IARCHE_II_COLORS } from '@/components/admin/medias/CharterSelector';

// Mapping des couleurs entre les deux chartes
const COLOR_MAPPING: Record<string, string> = {
  // IArche I → IArche II
  [IARCHE_I_COLORS.bleuNuit]: IARCHE_II_COLORS.bleuNuit,
  [IARCHE_I_COLORS.bleuNuitDark]: IARCHE_II_COLORS.bleuNuitDark,
  [IARCHE_I_COLORS.terracotta]: IARCHE_II_COLORS.terracotta,
  // IArche II → IArche I
  [IARCHE_II_COLORS.bleuNuit]: IARCHE_I_COLORS.bleuNuit,
  [IARCHE_II_COLORS.bleuNuitDark]: IARCHE_I_COLORS.bleuNuitDark,
  [IARCHE_II_COLORS.terracotta]: IARCHE_I_COLORS.terracotta,
};

// Détecte si une couleur appartient à IArche I
const isIArcheIColor = (color: string): boolean => {
  const normalizedColor = color.toLowerCase();
  return (
    normalizedColor === IARCHE_I_COLORS.bleuNuit.toLowerCase() ||
    normalizedColor === IARCHE_I_COLORS.bleuNuitDark.toLowerCase() ||
    normalizedColor === IARCHE_I_COLORS.terracotta.toLowerCase()
  );
};

// Détecte si une couleur appartient à IArche II
const isIArcheIIColor = (color: string): boolean => {
  const normalizedColor = color.toLowerCase();
  return (
    normalizedColor === IARCHE_II_COLORS.bleuNuit.toLowerCase() ||
    normalizedColor === IARCHE_II_COLORS.bleuNuitDark.toLowerCase() ||
    normalizedColor === IARCHE_II_COLORS.terracotta.toLowerCase()
  );
};

// Convertit une couleur vers l'autre charte
const convertColor = (color: string, toCharter: 'iarche' | 'iarche2'): string => {
  const normalizedColor = color.toUpperCase();
  
  // Cherche dans le mapping
  for (const [from, to] of Object.entries(COLOR_MAPPING)) {
    if (from.toUpperCase() === normalizedColor) {
      // Vérifie qu'on convertit dans la bonne direction
      if (toCharter === 'iarche2' && isIArcheIColor(from)) {
        return to;
      }
      if (toCharter === 'iarche' && isIArcheIIColor(from)) {
        return to;
      }
    }
  }
  
  return color; // Retourne la couleur originale si pas de mapping
};

// Convertit une chaîne contenant des couleurs (pour les gradients CSS)
const convertColorString = (str: string, toCharter: 'iarche' | 'iarche2'): string => {
  let result = str;
  
  // Couleurs source selon la charte cible
  const sourceColors = toCharter === 'iarche2' ? IARCHE_I_COLORS : IARCHE_II_COLORS;
  const targetColors = toCharter === 'iarche2' ? IARCHE_II_COLORS : IARCHE_I_COLORS;
  
  // Remplace bleuNuit
  result = result.replace(new RegExp(sourceColors.bleuNuit, 'gi'), targetColors.bleuNuit);
  // Remplace bleuNuitDark
  result = result.replace(new RegExp(sourceColors.bleuNuitDark, 'gi'), targetColors.bleuNuitDark);
  // Remplace terracotta
  result = result.replace(new RegExp(sourceColors.terracotta, 'gi'), targetColors.terracotta);
  
  return result;
};

// Convertit récursivement les données d'un template
export const convertTemplateColors = (
  data: Record<string, unknown>,
  toCharter: 'iarche' | 'iarche2'
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Vérifie si c'est une couleur hex
      if (value.match(/^#[0-9A-Fa-f]{6}$/)) {
        result[key] = convertColor(value, toCharter);
      }
      // Vérifie si c'est un gradient ou contient des couleurs
      else if (value.includes('#') || value.includes('linear-gradient') || value.includes('radial-gradient')) {
        result[key] = convertColorString(value, toCharter);
      }
      else {
        result[key] = value;
      }
    }
    else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' && item !== null
          ? convertTemplateColors(item as Record<string, unknown>, toCharter)
          : item
      );
    }
    else if (typeof value === 'object' && value !== null) {
      result[key] = convertTemplateColors(value as Record<string, unknown>, toCharter);
    }
    else {
      result[key] = value;
    }
  }
  
  return result;
};

// Détermine la charte source d'un template basé sur ses couleurs
export const detectTemplateCharter = (data: Record<string, unknown>): 'iarche' | 'iarche2' | null => {
  const jsonStr = JSON.stringify(data).toLowerCase();
  
  const hasIArcheI = 
    jsonStr.includes(IARCHE_I_COLORS.bleuNuit.toLowerCase()) ||
    jsonStr.includes(IARCHE_I_COLORS.terracotta.toLowerCase());
    
  const hasIArcheII = 
    jsonStr.includes(IARCHE_II_COLORS.bleuNuit.toLowerCase()) ||
    jsonStr.includes(IARCHE_II_COLORS.terracotta.toLowerCase());
  
  if (hasIArcheI && !hasIArcheII) return 'iarche';
  if (hasIArcheII && !hasIArcheI) return 'iarche2';
  
  return null; // Impossible à déterminer ou mixte
};
