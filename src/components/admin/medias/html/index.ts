/**
 * IArche HTML Design System v4.2 for PNG exports
 * 
 * CHANGELOG v4.2:
 * - HTMLHeaderGradient pour reproduire le style email
 * 
 * CHANGELOG v4.0:
 * - HTMLLogoWithArc remplace HTMLLogoWithBar
 * - Arcs au lieu de barres gradient
 * - Suppression des canalisations
 * - Suppression du fond quadrillé (mesh)
 * - Suppression des composants legacy (HTMLLogoWithBar, HTMLGradientBar)
 */

// Tokens - Source unique de vérité
export * from './tokens';

// Composants v4.0+
export { HTMLLogo } from './HTMLLogo';
export { HTMLLogoArc } from './HTMLLogoArc';
export { HTMLLogoWithArc } from './HTMLLogoWithArc';
export { HTMLLogoDiscret } from './HTMLLogoDiscret'; // v4.1 - Logo discret
export { HTMLHeaderGradient } from './HTMLHeaderGradient'; // v4.2 - Style email
export { HTMLBaseTemplate } from './HTMLBaseTemplate';

// CTA Text utilities (v4.2 - Règle CTA blanc cassé/terracotta)
export { CTAText, getCTAColor, getCTAColorHex, getCTABadgeStyles, getCTABulletStyles } from '../CTAText';

// Image Library (Supabase Storage)
export { ImageLibrary } from '../ImageLibrary';
