import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ILOVEPDF_API = "https://api.ilovepdf.com/v1";

interface TaskResponse {
  server: string;
  task: string;
}

interface UploadResponse {
  server_filename: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      docx_base64, 
      filename = "document",
      document_id,
      save_to_storage = true 
    } = await req.json();

    if (!docx_base64) {
      throw new Error("docx_base64 is required");
    }

    const publicKey = Deno.env.get("ILOVEPDF_PUBLIC_KEY");
    const secretKey = Deno.env.get("ILOVEPDF_SECRET_KEY");

    if (!publicKey || !secretKey) {
      throw new Error("iLovePDF API keys not configured");
    }

    console.log(`[convert-to-pdf] Starting conversion for: ${filename}`);

    // 1. Authenticate with iLovePDF
    console.log("[convert-to-pdf] Authenticating with iLovePDF...");
    const authResponse = await fetch(`${ILOVEPDF_API}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: publicKey }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error("[convert-to-pdf] Auth failed:", errorText);
      throw new Error(`iLovePDF auth failed: ${authResponse.status}`);
    }

    const { token } = await authResponse.json();
    console.log("[convert-to-pdf] Auth successful");

    // 2. Start conversion task (office to PDF)
    console.log("[convert-to-pdf] Starting officepdf task...");
    const startResponse = await fetch(`${ILOVEPDF_API}/start/officepdf`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error("[convert-to-pdf] Start task failed:", errorText);
      throw new Error(`Failed to start task: ${startResponse.status}`);
    }

    const taskData: TaskResponse = await startResponse.json();
    const { server, task } = taskData;
    console.log(`[convert-to-pdf] Task created: ${task} on server: ${server}`);

    // 3. Convert base64 to blob and upload
    console.log("[convert-to-pdf] Uploading DOCX to iLovePDF...");
    
    // Decode base64 to bytes
    const binaryString = atob(docx_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const formData = new FormData();
    formData.append("task", task);
    formData.append("file", new Blob([bytes], { 
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
    }), `${filename}.docx`);

    const uploadResponse = await fetch(`https://${server}/v1/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[convert-to-pdf] Upload failed:", errorText);
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadData: UploadResponse = await uploadResponse.json();
    console.log(`[convert-to-pdf] File uploaded: ${uploadData.server_filename}`);

    // 4. Process conversion
    console.log("[convert-to-pdf] Processing conversion...");
    const processResponse = await fetch(`https://${server}/v1/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task,
        tool: "officepdf",
        files: [{ server_filename: uploadData.server_filename, filename: `${filename}.docx` }],
      }),
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error("[convert-to-pdf] Process failed:", errorText);
      throw new Error(`Process failed: ${processResponse.status}`);
    }

    console.log("[convert-to-pdf] Conversion processed");

    // 5. Download converted PDF
    console.log("[convert-to-pdf] Downloading converted PDF...");
    const downloadResponse = await fetch(`https://${server}/v1/download/${task}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      console.error("[convert-to-pdf] Download converted failed:", errorText);
      throw new Error(`Download failed: ${downloadResponse.status}`);
    }

    const pdfArrayBuffer = await downloadResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfArrayBuffer);
    console.log(`[convert-to-pdf] PDF downloaded: ${pdfBytes.length} bytes`);

    // 6. Convert to base64 for response
    let pdfBase64 = "";
    const chunkSize = 8192;
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.slice(i, i + chunkSize);
      pdfBase64 += String.fromCharCode(...chunk);
    }
    pdfBase64 = btoa(pdfBase64);

    // 7. Optionally save to Supabase storage
    let publicUrl = null;
    if (save_to_storage && document_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const storagePath = `documents/${document_id}/${filename}.pdf`;
      
      const { error: uploadStorageError } = await supabase.storage
        .from("generated-documents")
        .upload(storagePath, new Blob([pdfBytes], { type: "application/pdf" }), {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadStorageError) {
        console.error("[convert-to-pdf] Storage upload error:", uploadStorageError);
        // Don't fail, still return the base64
      } else {
        const { data: urlData } = supabase.storage
          .from("generated-documents")
          .getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
        console.log(`[convert-to-pdf] PDF saved to storage: ${publicUrl}`);
      }
    }

    console.log("[convert-to-pdf] Conversion complete!");

    return new Response(
      JSON.stringify({
        success: true,
        pdf_base64: pdfBase64,
        pdf_url: publicUrl,
        file_size: pdfBytes.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[convert-to-pdf] Error:", error);
    return new Response(
      JSON.stringify({
        error: "conversion_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
