import React from 'react';
import { IARCHE_COLORS, IARCHE_FONTS, ThemeType } from './html';

interface CTATextProps {
  children: React.ReactNode;
  theme: ThemeType;
  fontSize?: number | string;
  fontWeight?: number;
  style?: React.CSSProperties;
  as?: 'span' | 'p' | 'div';
  className?: string;
}

/**
 * v4.2 Règle d'or: CTA en blanc cassé sur gradient, sinon terracotta
 * Composant réutilisable pour tous les textes CTA dans les éditeurs médias
 */
export const getCTAColor = (theme: ThemeType): string => {
  return theme === 'gradient' ? IARCHE_COLORS.blancCasse : IARCHE_COLORS.terracotta;
};

export const CTAText: React.FC<CTATextProps> = ({
  children,
  theme,
  fontSize = 16,
  fontWeight = 600,
  style = {},
  as: Component = 'span',
  className,
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
        ...style,
      }}
    >
      {children}
    </Component>
  );
};

export default CTAText;
