import React from 'react';
import { IARCHE_COLORS, IARCHE_FONTS, ThemeType } from './html';

interface CTATextProps {
  children: React.ReactNode;
  theme: ThemeType;
  fontSize?: number | string;
  fontWeight?: number;
  style?: React.CSSProperties;
  as?: 'span' | 'p' | 'div' | 'a';
  className?: string;
  uppercase?: boolean;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * v4.2 Règle d'or: CTA en blanc cassé sur gradient, sinon terracotta
 * Composant réutilisable pour tous les textes CTA dans les éditeurs médias
 */
export const getCTAColor = (theme: ThemeType): string => {
  return theme === 'gradient' ? IARCHE_COLORS.blancCasse : IARCHE_COLORS.terracotta;
};

/**
 * Get CTA color for inline styles in templates (non-React context like PDF export)
 */
export const getCTAColorHex = (theme: string): string => {
  return theme === 'gradient' ? '#FAF9F7' : '#B04A32';
};

/**
 * Get CTA background for badges on gradient theme
 */
export const getCTABadgeStyles = (theme: ThemeType | string, isDark: boolean = true) => {
  if (theme === 'gradient') {
    return {
      background: 'rgba(250, 249, 247, 0.15)',
      color: '#FAF9F7',
      border: '1px solid rgba(250, 249, 247, 0.25)',
    };
  }
  return {
    background: isDark ? 'rgba(176, 74, 50, 0.25)' : 'rgba(176, 74, 50, 0.15)',
    color: isDark ? '#E8B4A0' : '#8B3A2F',
    border: `1px solid ${isDark ? 'rgba(176, 74, 50, 0.4)' : 'rgba(176, 74, 50, 0.3)'}`,
  };
};

/**
 * Get numbered bullet badge styles
 */
export const getCTABulletStyles = (theme: ThemeType | string) => {
  if (theme === 'gradient') {
    return {
      background: 'rgba(250, 249, 247, 0.15)',
      color: '#FAF9F7',
    };
  }
  return {
    background: 'rgba(176, 74, 50, 0.15)',
    color: '#B04A32',
  };
};

export const CTAText: React.FC<CTATextProps> = ({
  children,
  theme,
  fontSize = 16,
  fontWeight = 600,
  style = {},
  as: Component = 'span',
  className,
  uppercase = false,
  letterSpacing,
  textAlign,
}) => {
  const ctaColor = getCTAColor(theme);

  return (
    <Component
      className={className}
      style={{
        fontFamily: IARCHE_FONTS.primary,
        fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
        fontWeight,
        color: ctaColor,
        textTransform: uppercase ? 'uppercase' : undefined,
        letterSpacing: letterSpacing,
        textAlign: textAlign,
        ...style,
      }}
    >
      {children}
    </Component>
  );
};

export default CTAText;
