/**
 * UTM Capture — capte les paramètres marketing au premier hit
 * et les conserve en sessionStorage pour les attacher aux leads
 * créés ultérieurement (form, booking, contact...).
 *
 * Usage:
 *  - import { captureUtmFromUrl, getStoredUtm } from "@/lib/utm";
 *  - captureUtmFromUrl() à appeler une fois au boot de l'app
 *  - getStoredUtm() retourne { utm_source, utm_medium, ... } à merger dans payload lead
 */

const STORAGE_KEY = "iarche_utm_v1";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmPayload = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
};

export function captureUtmFromUrl(): UtmPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const captured: UtmPayload = {};
    let hasAny = false;

    for (const key of UTM_KEYS) {
      const v = params.get(key);
      if (v) {
        captured[key] = v;
        hasAny = true;
      }
    }

    // Always set referrer + landing on first visit, even without UTM
    const existing = getStoredUtm();
    if (!existing) {
      captured.referrer = document.referrer || undefined;
      captured.landing_page = window.location.pathname + window.location.search;
      hasAny = hasAny || !!captured.referrer || !!captured.landing_page;
    }

    if (!hasAny) return existing;

    const merged = { ...(existing ?? {}), ...captured };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return null;
  }
}

export function getStoredUtm(): UtmPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UtmPayload) : null;
  } catch {
    return null;
  }
}

export function clearStoredUtm() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
