/**
 * Tests unitaires pour les fonctions CTA du design system IArche v4.2
 * Règle d'or: CTA en blanc cassé sur gradient, sinon terracotta
 */

import { describe, it, expect } from 'vitest';
import { getCTAColor, getCTAColorHex, getCTABadgeStyles, getCTABulletStyles } from '../CTAText';

describe('getCTAColor', () => {
  it('should return blancCasse (#FAF9F7) for gradient theme', () => {
    expect(getCTAColor('gradient')).toBe('#FAF9F7');
  });

  it('should return terracotta (#B04A32) for dark theme', () => {
    expect(getCTAColor('dark')).toBe('#B04A32');
  });

  it('should return terracotta (#B04A32) for light theme', () => {
    expect(getCTAColor('light')).toBe('#B04A32');
  });

  it('should return terracotta (#B04A32) for terra theme', () => {
    expect(getCTAColor('terra')).toBe('#B04A32');
  });

  it('should return terracotta (#B04A32) for contrast theme', () => {
    expect(getCTAColor('contrast')).toBe('#B04A32');
  });
});

describe('getCTAColorHex', () => {
  it('should return #FAF9F7 for gradient theme', () => {
    expect(getCTAColorHex('gradient')).toBe('#FAF9F7');
  });

  it('should return #B04A32 for any non-gradient theme', () => {
    expect(getCTAColorHex('dark')).toBe('#B04A32');
    expect(getCTAColorHex('light')).toBe('#B04A32');
    expect(getCTAColorHex('terra')).toBe('#B04A32');
    expect(getCTAColorHex('other')).toBe('#B04A32');
  });
});

describe('getCTABadgeStyles', () => {
  describe('gradient theme', () => {
    it('should return blanc cassé styles with transparency', () => {
      const styles = getCTABadgeStyles('gradient');
      expect(styles.background).toBe('rgba(250, 249, 247, 0.15)');
      expect(styles.color).toBe('#FAF9F7');
      expect(styles.border).toBe('1px solid rgba(250, 249, 247, 0.25)');
    });

    it('should ignore isDark parameter for gradient theme', () => {
      const stylesDark = getCTABadgeStyles('gradient', true);
      const stylesLight = getCTABadgeStyles('gradient', false);
      expect(stylesDark).toEqual(stylesLight);
    });
  });

  describe('non-gradient themes', () => {
    it('should return darker terracotta styles when isDark is true', () => {
      const styles = getCTABadgeStyles('dark', true);
      expect(styles.background).toBe('rgba(176, 74, 50, 0.25)');
      expect(styles.color).toBe('#E8B4A0');
      expect(styles.border).toBe('1px solid rgba(176, 74, 50, 0.4)');
    });

    it('should return lighter terracotta styles when isDark is false', () => {
      const styles = getCTABadgeStyles('light', false);
      expect(styles.background).toBe('rgba(176, 74, 50, 0.15)');
      expect(styles.color).toBe('#8B3A2F');
      expect(styles.border).toBe('1px solid rgba(176, 74, 50, 0.3)');
    });

    it('should default to isDark true when not specified', () => {
      const styles = getCTABadgeStyles('dark');
      expect(styles.color).toBe('#E8B4A0');
    });
  });
});

describe('getCTABulletStyles', () => {
  it('should return blanc cassé styles for gradient theme', () => {
    const styles = getCTABulletStyles('gradient');
    expect(styles.background).toBe('rgba(250, 249, 247, 0.15)');
    expect(styles.color).toBe('#FAF9F7');
  });

  it('should return terracotta styles for non-gradient themes', () => {
    const stylesDark = getCTABulletStyles('dark');
    expect(stylesDark.background).toBe('rgba(176, 74, 50, 0.15)');
    expect(stylesDark.color).toBe('#B04A32');

    const stylesLight = getCTABulletStyles('light');
    expect(stylesLight.background).toBe('rgba(176, 74, 50, 0.15)');
    expect(stylesLight.color).toBe('#B04A32');
  });
});

describe('Color consistency across functions', () => {
  it('should use same blanc cassé color across all gradient theme functions', () => {
    const blancCasse = '#FAF9F7';
    expect(getCTAColor('gradient')).toBe(blancCasse);
    expect(getCTAColorHex('gradient')).toBe(blancCasse);
    expect(getCTABadgeStyles('gradient').color).toBe(blancCasse);
    expect(getCTABulletStyles('gradient').color).toBe(blancCasse);
  });

  it('should use same terracotta color across non-gradient theme functions', () => {
    const terracotta = '#B04A32';
    expect(getCTAColor('dark')).toBe(terracotta);
    expect(getCTAColorHex('dark')).toBe(terracotta);
    expect(getCTABulletStyles('dark').color).toBe(terracotta);
  });
});
