// Shared helper: load workspace branding for AI-generated documents, emails, exports.
// Returns null-safe defaults so callers can spread into templates without checks.

import { createClient } from "npm:@supabase/supabase-js@2";

export type WorkspaceBranding = {
  workspace_id: string;
  brand_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  text_color: string | null;
  heading_font: string | null;
  body_font: string | null;
  footer_text: string | null;
  email_signature_html: string | null;
  document_header_html: string | null;
  document_footer_html: string | null;
};

const DEFAULTS: Omit<WorkspaceBranding, "workspace_id"> = {
  brand_name: "IArche",
  tagline: null,
  logo_url: null, logo_dark_url: null, favicon_url: null,
  primary_color: "#1A2B4A",
  secondary_color: "#B04A32",
  accent_color: "#FAF9F7",
  background_color: "#FFFFFF",
  text_color: "#0F172A",
  heading_font: "Manrope",
  body_font: "Inter",
  footer_text: null,
  email_signature_html: null,
  document_header_html: null,
  document_footer_html: null,
};

/**
 * Load branding for a workspace. Uses service-role to bypass RLS so this works
 * from any AI/export edge function regardless of caller identity.
 * Always returns a fully-populated object (workspace value > defaults).
 */
export async function getWorkspaceBranding(workspaceId: string): Promise<WorkspaceBranding> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data } = await supabase
    .from("workspace_branding")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const merged: WorkspaceBranding = { workspace_id: workspaceId, ...DEFAULTS };
  if (data) {
    for (const k of Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]) {
      const v = (data as Record<string, unknown>)[k];
      if (v !== null && v !== undefined && v !== "") {
        (merged as Record<string, unknown>)[k] = v;
      }
    }
  }
  return merged;
}

/**
 * Convert branding to {{brand_*}} template variables for prompt/HTML injection.
 */
export function brandingToTemplateVars(b: WorkspaceBranding): Record<string, string> {
  return {
    brand_name: b.brand_name ?? "",
    brand_tagline: b.tagline ?? "",
    brand_logo_url: b.logo_url ?? "",
    brand_logo_dark_url: b.logo_dark_url ?? "",
    brand_favicon_url: b.favicon_url ?? "",
    brand_primary_color: b.primary_color ?? "",
    brand_secondary_color: b.secondary_color ?? "",
    brand_accent_color: b.accent_color ?? "",
    brand_background_color: b.background_color ?? "",
    brand_text_color: b.text_color ?? "",
    brand_heading_font: b.heading_font ?? "",
    brand_body_font: b.body_font ?? "",
    brand_footer_text: b.footer_text ?? "",
    brand_email_signature_html: b.email_signature_html ?? "",
    brand_document_header_html: b.document_header_html ?? "",
    brand_document_footer_html: b.document_footer_html ?? "",
  };
}
