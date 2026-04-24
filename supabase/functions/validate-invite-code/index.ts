import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const code = (body?.code || "").toString().trim();
    const email = (body?.email || "").toString().trim().toLowerCase();

    if (!code) {
      return new Response(JSON.stringify({ valid: false, reason: "missing_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invite, error } = await supabase
      .from("invite_codes")
      .select("id, code, email_restriction, max_uses, uses_count, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ valid: false, reason: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invite) {
      return new Response(JSON.stringify({ valid: false, reason: "invalid" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, reason: "expired" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.uses_count >= invite.max_uses) {
      return new Response(JSON.stringify({ valid: false, reason: "max_uses_reached" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      invite.email_restriction &&
      email &&
      invite.email_restriction.toLowerCase() !== email
    ) {
      return new Response(
        JSON.stringify({ valid: false, reason: "email_restriction_mismatch" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, email_restriction: invite.email_restriction }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(JSON.stringify({ valid: false, reason: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
