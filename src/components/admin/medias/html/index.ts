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
 */

// Tokens - Source unique de vérité
export * from './tokens';

// Composants partagés
export { HTMLLogo } from './HTMLLogo';
export { HTMLLogoArc } from './HTMLLogoArc';
export { HTMLLogoWithArc } from './HTMLLogoWithArc';
export { HTMLLogoWithBar } from './HTMLLogoWithBar'; // Legacy
export { HTMLGradientBar } from './HTMLGradientBar'; // Legacy
export { HTMLLogoDiscret } from './HTMLLogoDiscret'; // v4.1 - Logo discret
export { HTMLHeaderGradient } from './HTMLHeaderGradient'; // v4.2 - Style email
export { HTMLBaseTemplate } from './HTMLBaseTemplate';

// Image Library (Supabase Storage)
export { ImageLibrary } from '../ImageLibrary';
