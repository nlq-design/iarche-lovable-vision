import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Serve Transcription Audio
 *
 * Renvoie une URL signée (1h) vers le fichier audio d'une transcription, par slug ou id.
 *
 * 🔒 Isolation multi-tenant (2026-07-01) : l'appelant DOIT être authentifié et avoir
 * accès au workspace de la transcription (can_access_workspace : admin/cockpit_admin
 * OU membre du workspace). Auparavant l'endpoint servait n'importe quel audio par
 * id/slug SANS auth → fuite active cross-tenant de conversations privées (corrigé).
 *
 * Usage: GET /serve-transcription-audio?slug=... (Authorization: Bearer <user JWT>)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const id = url.searchParams.get('id');

    if (!slug && !id) {
      return json({ error: "missing_identifier", message: "slug or id is required" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 🔒 1. Authentification obligatoire de l'appelant
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;
    if (!token) {
      return json({ error: "unauthorized", message: "Authorization Bearer token required" }, 401);
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized", message: "Invalid or expired session" }, 401);
    }
    const userId = userData.user.id;

    // Fetch transcription by slug or id (incl. workspace_id pour le contrôle d'accès)
    let query = supabase
      .from("voice_transcriptions")
      .select("id, slug, storage_path, source, workspace_id");

    if (slug) {
      query = query.eq("slug", slug);
    } else if (id) {
      query = query.eq("id", id);
    }

    const { data: transcription, error: fetchError } = await query.single();

    if (fetchError || !transcription) {
      console.error("[serve-transcription-audio] Not found:", slug || id, fetchError);
      return json({ error: "not_found", message: "Transcription not found" }, 404);
    }

    // 🔒 2. Contrôle d'accès tenant : l'appelant doit avoir accès au workspace de la transcription
    const { data: canAccess, error: accessErr } = await supabase.rpc("can_access_workspace", {
      p_workspace_id: transcription.workspace_id,
      p_user_id: userId,
    });
    if (accessErr || canAccess !== true) {
      console.warn(`[serve-transcription-audio] Access denied user=${userId} ws=${transcription.workspace_id}`);
      return json({ error: "forbidden", message: "You do not have access to this transcription" }, 403);
    }

    if (!transcription.storage_path) {
      return json({ error: "no_audio", message: "No audio file for this transcription" }, 404);
    }

    console.log(`[serve-transcription-audio] Serving: ${transcription.slug} -> ${transcription.storage_path}`);

    // Generate signed URL for the audio file
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from("voice-transcriptions")
      .createSignedUrl(transcription.storage_path, 3600); // 1 hour expiry

    if (signError || !signedUrlData?.signedUrl) {
      console.error("[serve-transcription-audio] Sign error:", signError);
      return json({ error: "storage_error", message: "Failed to generate audio URL" }, 500);
    }

    // Return JSON with audio URL and metadata
    return json({
      ok: true,
      slug: transcription.slug,
      id: transcription.id,
      audio_url: signedUrlData.signedUrl,
      source: transcription.source,
      expires_in: 3600,
    });

  } catch (error) {
    console.error("[serve-transcription-audio] Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
