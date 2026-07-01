import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { useWorkspaceBranding, type WorkspaceBranding } from '@/hooks/useWorkspaceBranding';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';

/**
 * White-label runtime (charte v4 compatible).
 *
 * Applique l'identité visuelle du locataire (`workspace_branding`) aux variables
 * CSS de la charte, AU RUNTIME. Le locataire fondateur IArche (`…001`) n'est
 * JAMAIS surchargé → la charte v4 reste intacte pour IArche. Un locataire sans
 * ligne de branding hérite aussi de la charte (dégradation propre).
 */

/** hex (#RRGGBB) → "H S% L%" pour les tokens HSL de la charte. */
function hexToHsl(hex: string): string | null {
  const m = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Champ branding → variable CSS de la charte. */
const COLOR_VARS: Array<[keyof WorkspaceBranding, string]> = [
  ['primary_color', '--primary'],
  ['secondary_color', '--secondary'],
  ['accent_color', '--accent-vivid'],
  ['background_color', '--background'],
  ['text_color', '--foreground'],
];

interface BrandingContextValue {
  /** Branding du locataire courant (null pour IArche fondateur). */
  branding: WorkspaceBranding | null;
  /** true si un locataire a une marque personnalisée active. */
  isWhiteLabel: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({ branding: null, isWhiteLabel: false });

// eslint-disable-next-line react-refresh/only-export-components
export const useBranding = () => useContext(BrandingContext);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const workspaceId = useWorkspaceId();
  const isTenant = !!workspaceId && workspaceId !== DEFAULT_WORKSPACE_ID;
  const { data: branding } = useWorkspaceBranding(isTenant ? workspaceId : null);

  useEffect(() => {
    const root = document.documentElement;
    const applied: string[] = [];
    if (isTenant && branding) {
      for (const [field, cssVar] of COLOR_VARS) {
        const raw = branding[field] as string | null;
        if (raw) {
          const hsl = hexToHsl(raw);
          if (hsl) {
            root.style.setProperty(cssVar, hsl);
            applied.push(cssVar);
          }
        }
      }
      if (branding.favicon_url) {
        const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (link) link.href = branding.favicon_url;
      }
      // Police du locataire (Google Font chargée dynamiquement, fallback Manrope)
      const font = branding.body_font?.trim();
      if (font) {
        const id = 'wl-tenant-font';
        let fontLink = document.getElementById(id) as HTMLLinkElement | null;
        if (!fontLink) {
          fontLink = document.createElement('link');
          fontLink.id = id;
          fontLink.rel = 'stylesheet';
          document.head.appendChild(fontLink);
        }
        fontLink.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
        root.style.setProperty('--font-sans', `'${font}', 'Manrope', sans-serif`);
        applied.push('--font-sans');
      }
    }
    // Nettoyage : on retire les surcharges quand on quitte / change de tenant.
    return () => {
      for (const v of applied) root.style.removeProperty(v);
      document.getElementById('wl-tenant-font')?.remove();
    };
  }, [isTenant, branding]);

  return (
    <BrandingContext.Provider
      value={{
        branding: isTenant ? branding ?? null : null,
        isWhiteLabel: isTenant && !!branding?.brand_name,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}
