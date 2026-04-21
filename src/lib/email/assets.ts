/**
 * URLs publiques des assets email (bucket Supabase Storage "email-assets").
 *
 * IMPORTANT — Workflow :
 * 1. Ouvrir /admin/email-assets-generator
 * 2. Cliquer "Générer logo PNG 600x160"
 * 3. Cliquer "Générer hero gradient 1200x600"
 * 4. Les URLs générées correspondent EXACTEMENT à celles ci-dessous
 *    (chemins fixes dans le bucket).
 *
 * Si l'un des assets n'a pas encore été généré, l'image cassée s'affichera
 * dans l'email mais ne bloque pas le rendu (alt text + couleurs de fallback).
 */

const PROJECT_REF = 'mgjyhlyrwnnioctkbdkk';
const STORAGE_BASE = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/email-assets`;

export const EMAIL_ASSETS = {
  logo: `${STORAGE_BASE}/iarche-logo-600x160.png`,
  heroBackground: `${STORAGE_BASE}/hero-bg-gradient-1200x600.png`,
} as const;

export const EMAIL_ASSET_PATHS = {
  logo: 'iarche-logo-600x160.png',
  heroBackground: 'hero-bg-gradient-1200x600.png',
} as const;
