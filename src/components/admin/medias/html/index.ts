/**
 * IArche HTML Design System v4.0 for PNG exports
 * 
 * CHANGELOG v4.0:
 * - HTMLLogoWithArc remplace HTMLLogoWithBar
 * - Arcs au lieu de barres gradient
 * - Suppression des canalisations
 */

// Tokens - Source unique de vérité
export * from './tokens';

// Composants partagés
export { HTMLLogo } from './HTMLLogo';
export { HTMLLogoArc } from './HTMLLogoArc';
export { HTMLLogoWithArc } from './HTMLLogoWithArc';
export { HTMLLogoWithBar } from './HTMLLogoWithBar'; // Legacy
export { HTMLGradientBar } from './HTMLGradientBar'; // Legacy
export { HTMLMeshBackground } from './HTMLMeshBackground';
export { HTMLBaseTemplate } from './HTMLBaseTemplate';

// Image Library (Supabase Storage)
export { ImageLibrary } from '../ImageLibrary';
