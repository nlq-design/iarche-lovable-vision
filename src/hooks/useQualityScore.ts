/**
 * IArche Quality Score System
 * Calcul temps réel du score qualité selon les specs MEDIA_QUALITY_SCORE.md
 * 
 * Structure du score (100 points):
 * - Contraste: 30%
 * - Safe Zones: 20%
 * - Densité: 20%
 * - Hiérarchie: 15%
 * - Palette: 15%
 */

import { useMemo, useCallback } from 'react';
import { COLORS as IARCHE_COLORS } from '@/components/admin/medias/shared/tokens';

// Types
export interface QualityConfig {
  format: 'carousel' | 'banner' | 'post-square' | 'post-landscape' | 'story' | 'thumbnail' | 'og';
  theme: 'dark' | 'light' | 'terra' | 'contrast';
}

export interface ContentSlot {
  type: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'highlight';
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor: string;
}

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QualityInput {
  config: QualityConfig;
  slots: ContentSlot[];
  elements: ElementPosition[];
  colors: string[];
  hasArcInHeader?: boolean;
  hasLogoWithArc?: boolean;
  dimensions: { width: number; height: number };
}

export interface CriteriaScore {
  name: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'warning' | 'fail';
  issues: string[];
  recommendations: string[];
}

export interface QualityResult {
  totalScore: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'insufficient' | 'critical';
  canExport: boolean;
  blockingIssues: string[];
  criteria: {
    contrast: CriteriaScore;
    safeZones: CriteriaScore;
    density: CriteriaScore;
    hierarchy: CriteriaScore;
    palette: CriteriaScore;
  };
  perceptualBonus: number;
}

// Constantes
const SAFE_ZONES: Record<QualityConfig['format'], { horizontal: number; vertical: number }> = {
  carousel: { horizontal: 64, vertical: 64 },
  banner: { horizontal: 48, vertical: 32 },
  'post-square': { horizontal: 80, vertical: 80 },
  'post-landscape': { horizontal: 64, vertical: 48 },
  story: { horizontal: 80, vertical: 80 },
  thumbnail: { horizontal: 96, vertical: 96 },
  og: { horizontal: 64, vertical: 64 },
};

const DENSITY_LIMITS: Record<QualityConfig['format'], { maxChars: number; maxBlocks: number; maxElements: number }> = {
  carousel: { maxChars: 320, maxBlocks: 2, maxElements: 3 },
  banner: { maxChars: 120, maxBlocks: 2, maxElements: 2 },
  'post-square': { maxChars: 250, maxBlocks: 3, maxElements: 3 },
  'post-landscape': { maxChars: 200, maxBlocks: 2, maxElements: 3 },
  story: { maxChars: 180, maxBlocks: 2, maxElements: 2 },
  thumbnail: { maxChars: 100, maxBlocks: 2, maxElements: 3 },
  og: { maxChars: 150, maxBlocks: 2, maxElements: 3 },
};

const VALID_COLORS = [
  '#1A2B4A', '#14203A', '#B04A32', '#8C3A28', '#FAF9F7',
  '#FFFFFF', '#2D2D2D', '#666666', '#6B7280', '#F5F3EF',
  '#E8E4DD', '#0D1520',
];

const VALID_ALPHA_PATTERNS = [
  /rgba\(255,\s*255,\s*255,\s*0\.[4-9]\d*\)/,
  /rgba\(255,\s*255,\s*255,\s*[1]\)/,
  /rgba\(250,\s*249,\s*247,\s*0\.8[8-9]\d*\)/,
  /rgba\(250,\s*249,\s*247,\s*0\.9\d*\)/,
  /rgba\(250,\s*249,\s*247,\s*1\)/,
  /rgba\(26,\s*43,\s*74,\s*0\.\d+\)/,
  /rgba\(176,\s*74,\s*50,\s*0\.\d+\)/,
];

// Helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function isValidColor(color: string): boolean {
  if (VALID_COLORS.includes(color.toUpperCase()) || VALID_COLORS.includes(color.toLowerCase())) {
    return true;
  }
  return VALID_ALPHA_PATTERNS.some(pattern => pattern.test(color.replace(/\s/g, '')));
}

function normalizeColor(color: string): string {
  return color.trim().toUpperCase();
}

// Calcul des critères
function calculateContrastScore(slots: ContentSlot[]): CriteriaScore {
  let score = 0;
  const maxScore = 30;
  const issues: string[] = [];
  const recommendations: string[] = [];
  let hasBlockingIssue = false;

  slots.forEach(slot => {
    const ratio = getContrastRatio(slot.color, slot.backgroundColor);
    const isLargeText = slot.fontSize >= 24 || slot.fontWeight >= 700;
    const minRatio = isLargeText ? 3 : 4.5;

    if (ratio >= minRatio) {
      if (slot.type === 'h1' || slot.type === 'h2') {
        score += 10;
      } else if (slot.type === 'body') {
        score += 5;
      } else {
        score += 3;
      }
    } else {
      hasBlockingIssue = true;
      issues.push(`Contraste ${slot.type} insuffisant (${ratio.toFixed(1)}:1, min ${minRatio}:1)`);
      recommendations.push(`Augmenter le contraste du ${slot.type} — ratio actuel ${ratio.toFixed(1)}:1`);
    }
  });

  // Cap at max
  score = Math.min(score, maxScore);

  return {
    name: 'Contraste',
    score,
    maxScore,
    status: hasBlockingIssue ? 'fail' : score >= 24 ? 'pass' : 'warning',
    issues,
    recommendations,
  };
}

function calculateSafeZonesScore(
  elements: ElementPosition[],
  dimensions: { width: number; height: number },
  format: QualityConfig['format']
): CriteriaScore {
  const maxScore = 20;
  let score = maxScore;
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  const safeZone = SAFE_ZONES[format];
  let hasBlockingIssue = false;

  elements.forEach((el, index) => {
    const leftMargin = el.x;
    const rightMargin = dimensions.width - (el.x + el.width);
    const topMargin = el.y;
    const bottomMargin = dimensions.height - (el.y + el.height);

    if (leftMargin < safeZone.horizontal || rightMargin < safeZone.horizontal) {
      hasBlockingIssue = true;
      score -= 10;
      issues.push(`Élément ${index + 1} trop proche du bord horizontal`);
      recommendations.push(`Décaler l'élément de ${safeZone.horizontal - Math.min(leftMargin, rightMargin)}px`);
    }
    if (topMargin < safeZone.vertical || bottomMargin < safeZone.vertical) {
      hasBlockingIssue = true;
      score -= 10;
      issues.push(`Élément ${index + 1} trop proche du bord vertical`);
      recommendations.push(`Décaler l'élément de ${safeZone.vertical - Math.min(topMargin, bottomMargin)}px`);
    }
  });

  score = Math.max(0, score);

  return {
    name: 'Safe Zones',
    score,
    maxScore,
    status: hasBlockingIssue ? 'fail' : score >= 16 ? 'pass' : 'warning',
    issues,
    recommendations,
  };
}

function calculateDensityScore(
  slots: ContentSlot[],
  elements: ElementPosition[],
  format: QualityConfig['format']
): CriteriaScore {
  const maxScore = 20;
  let score = maxScore;
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  const limits = DENSITY_LIMITS[format];
  
  // Count characters
  const totalChars = slots.reduce((sum, slot) => sum + slot.text.length, 0);
  if (totalChars > limits.maxChars) {
    const excess = ((totalChars - limits.maxChars) / limits.maxChars) * 100;
    if (excess > 50) {
      score -= 10;
    } else if (excess > 20) {
      score -= 5;
    }
    issues.push(`Trop de texte (${totalChars}/${limits.maxChars} caractères)`);
    recommendations.push(`Réduire le texte de ${totalChars - limits.maxChars} caractères`);
  }

  // Count text blocks
  const textBlocks = slots.filter(s => s.text.length > 0).length;
  if (textBlocks > limits.maxBlocks) {
    score -= 8;
    issues.push(`Trop de blocs texte (${textBlocks}/${limits.maxBlocks})`);
    recommendations.push(`Réduire à ${limits.maxBlocks} blocs texte maximum`);
  }

  // Count visual elements
  if (elements.length > limits.maxElements) {
    score -= 5;
    issues.push(`Trop d'éléments visuels (${elements.length}/${limits.maxElements})`);
    recommendations.push(`Simplifier à ${limits.maxElements} éléments maximum`);
  }

  score = Math.max(0, score);

  return {
    name: 'Densité',
    score,
    maxScore,
    status: score >= 16 ? 'pass' : score >= 10 ? 'warning' : 'fail',
    issues,
    recommendations,
  };
}

function calculateHierarchyScore(slots: ContentSlot[]): CriteriaScore {
  const maxScore = 15;
  let score = maxScore;
  const issues: string[] = [];
  const recommendations: string[] = [];

  const h1 = slots.find(s => s.type === 'h1');
  const h2 = slots.find(s => s.type === 'h2');
  const body = slots.find(s => s.type === 'body');

  // Check H1/Body ratio (≥ 2.2)
  if (h1 && body) {
    const ratio = h1.fontSize / body.fontSize;
    if (ratio < 2.2) {
      score -= 6;
      issues.push(`Ratio H1/Body trop faible (${ratio.toFixed(1)}, min 2.2)`);
      recommendations.push(`Augmenter la taille du H1 à ${Math.ceil(body.fontSize * 2.2)}px`);
    }
  }

  // Check H2/Body ratio (≥ 1.4)
  if (h2 && body) {
    const ratio = h2.fontSize / body.fontSize;
    if (ratio < 1.4) {
      score -= 4;
      issues.push(`Ratio H2/Body trop faible (${ratio.toFixed(1)}, min 1.4)`);
      recommendations.push(`Augmenter la taille du H2 à ${Math.ceil(body.fontSize * 1.4)}px`);
    }
  }

  // Check H1/H2 ratio (≥ 1.3)
  if (h1 && h2) {
    const ratio = h1.fontSize / h2.fontSize;
    if (ratio < 1.3) {
      score -= 3;
      issues.push(`Ratio H1/H2 trop faible (${ratio.toFixed(1)}, min 1.3)`);
      recommendations.push(`Différencier davantage H1 et H2`);
    }
  }

  // Check single H1
  const h1Count = slots.filter(s => s.type === 'h1').length;
  if (h1Count > 1) {
    score -= 5;
    issues.push(`Plusieurs H1 détectés (${h1Count})`);
    recommendations.push(`Un seul H1 par zone`);
  }

  score = Math.max(0, score);

  return {
    name: 'Hiérarchie',
    score,
    maxScore,
    status: score >= 12 ? 'pass' : score >= 8 ? 'warning' : 'fail',
    issues,
    recommendations,
  };
}

function calculatePaletteScore(
  colors: string[],
  hasArcInHeader?: boolean,
  hasLogoWithArc?: boolean
): CriteriaScore {
  const maxScore = 15;
  let score = maxScore;
  const issues: string[] = [];
  const recommendations: string[] = [];
  let hasBlockingIssue = false;

  // Check all colors are valid
  colors.forEach(color => {
    if (!isValidColor(color)) {
      hasBlockingIssue = true;
      score -= 15;
      issues.push(`Couleur non autorisée: ${color}`);
      recommendations.push(`Remplacer ${color} par une couleur du design system`);
    }
  });

  // Check terracotta accent count
  const terracottaCount = colors.filter(c => 
    normalizeColor(c) === '#B04A32' || normalizeColor(c) === '#8C3A28'
  ).length;
  if (terracottaCount > 1) {
    score -= 5;
    issues.push(`Trop d'accents Terracotta (${terracottaCount})`);
    recommendations.push(`Garder 1 seul accent Terracotta par zone`);
  }

  // Check hard rules
  if (hasArcInHeader && hasLogoWithArc) {
    hasBlockingIssue = true;
    issues.push(`Arc + Logo en header interdit`);
    recommendations.push(`Retirer l'arc du header`);
  }

  score = Math.max(0, score);

  return {
    name: 'Palette',
    score,
    maxScore,
    status: hasBlockingIssue ? 'fail' : score >= 12 ? 'pass' : 'warning',
    issues,
    recommendations,
  };
}

function calculatePerceptualBonus(
  elements: ElementPosition[],
  dimensions: { width: number; height: number }
): number {
  let bonus = 0;

  // Check rhythm (regular spacing)
  if (elements.length >= 2) {
    const sortedByY = [...elements].sort((a, b) => a.y - b.y);
    const gaps: number[] = [];
    for (let i = 1; i < sortedByY.length; i++) {
      gaps.push(sortedByY[i].y - (sortedByY[i-1].y + sortedByY[i-1].height));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((acc, gap) => acc + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    if (variance < 100) {
      bonus += 3; // Regular spacing
    }
  }

  // Check breathing room (≥ 20% white space)
  const totalElementArea = elements.reduce((sum, el) => sum + el.width * el.height, 0);
  const totalArea = dimensions.width * dimensions.height;
  const whiteSpaceRatio = 1 - (totalElementArea / totalArea);
  if (whiteSpaceRatio >= 0.2) {
    bonus += 2;
  }

  return bonus;
}

// Hook principal
export function useQualityScore(input: QualityInput | null): QualityResult | null {
  return useMemo(() => {
    if (!input) return null;

    const { config, slots, elements, colors, hasArcInHeader, hasLogoWithArc, dimensions } = input;

    // Calculate each criteria
    const contrast = calculateContrastScore(slots);
    const safeZones = calculateSafeZonesScore(elements, dimensions, config.format);
    const density = calculateDensityScore(slots, elements, config.format);
    const hierarchy = calculateHierarchyScore(slots);
    const palette = calculatePaletteScore(colors, hasArcInHeader, hasLogoWithArc);

    // Calculate perceptual bonus
    const perceptualBonus = calculatePerceptualBonus(elements, dimensions);

    // Total score
    const criteriaTotal = contrast.score + safeZones.score + density.score + hierarchy.score + palette.score;
    const totalScore = Math.min(100, criteriaTotal + perceptualBonus);
    const maxScore = 100;

    // Determine blocking issues
    const blockingIssues: string[] = [];
    if (contrast.status === 'fail') {
      blockingIssues.push(...contrast.issues.filter(i => i.includes('insuffisant')));
    }
    if (safeZones.status === 'fail') {
      blockingIssues.push(...safeZones.issues);
    }
    if (palette.issues.some(i => i.includes('non autorisée') || i.includes('interdit'))) {
      blockingIssues.push(...palette.issues.filter(i => i.includes('non autorisée') || i.includes('interdit')));
    }

    // Determine status
    let status: QualityResult['status'];
    if (totalScore >= 90) status = 'excellent';
    else if (totalScore >= 80) status = 'good';
    else if (totalScore >= 60) status = 'insufficient';
    else status = 'critical';

    // Can export?
    const canExport = totalScore >= 80 && blockingIssues.length === 0;

    return {
      totalScore,
      maxScore,
      status,
      canExport,
      blockingIssues,
      criteria: {
        contrast,
        safeZones,
        density,
        hierarchy,
        palette,
      },
      perceptualBonus,
    };
  }, [input]);
}

// Hook pour créer facilement un input
export function useQualityInput() {
  const createInput = useCallback((
    format: QualityConfig['format'],
    theme: QualityConfig['theme'],
    content: {
      slots: Array<{ type: ContentSlot['type']; text: string; fontSize: number; fontWeight?: number }>;
      elementBounds: ElementPosition[];
    },
    options?: {
      hasArcInHeader?: boolean;
      hasLogoWithArc?: boolean;
    }
  ): QualityInput => {
    // Get theme colors
    const themeColors = {
      dark: { bg: IARCHE_COLORS.bleuNuit, text: '#FFFFFF', subtext: 'rgba(255,255,255,0.8)' },
      light: { bg: IARCHE_COLORS.blancCasse, text: IARCHE_COLORS.bleuNuit, subtext: IARCHE_COLORS.subtle },
      terra: { bg: IARCHE_COLORS.terracotta, text: IARCHE_COLORS.blancCasse, subtext: IARCHE_COLORS.blancCasse },
      contrast: { bg: '#0D1520', text: '#FFFFFF', subtext: 'rgba(255,255,255,0.8)' },
    };

    const colors = themeColors[theme];
    
    // Get dimensions for format
    const dimensions = {
      carousel: { width: 1080, height: 1350 },
      banner: { width: 1584, height: 396 },
      'post-square': { width: 1200, height: 1200 },
      'post-landscape': { width: 1200, height: 627 },
      story: { width: 1080, height: 1920 },
      thumbnail: { width: 1920, height: 1080 },
      og: { width: 1200, height: 630 },
    };

    const slots: ContentSlot[] = content.slots.map(s => ({
      type: s.type,
      text: s.text,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight || (s.type === 'h1' ? 700 : s.type === 'h2' ? 600 : 400),
      color: s.type === 'body' || s.type === 'caption' ? colors.subtext : colors.text,
      backgroundColor: colors.bg,
    }));

    return {
      config: { format, theme },
      slots,
      elements: content.elementBounds,
      colors: [colors.bg, colors.text, colors.subtext, IARCHE_COLORS.terracotta],
      hasArcInHeader: options?.hasArcInHeader,
      hasLogoWithArc: options?.hasLogoWithArc,
      dimensions: dimensions[format],
    };
  }, []);

  return { createInput };
}

export default useQualityScore;
