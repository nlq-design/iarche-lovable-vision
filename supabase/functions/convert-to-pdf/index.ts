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
    const { document_id, source_type = "docx" } = await req.json();

    const publicKey = Deno.env.get("ILOVEPDF_PUBLIC_KEY");
    const secretKey = Deno.env.get("ILOVEPDF_SECRET_KEY");

    if (!publicKey || !secretKey) {
      throw new Error("iLovePDF API keys not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    console.log(`[convert-to-pdf] Starting conversion for document: ${document_id}`);

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

    // 3. Get the DOCX file from storage
    console.log("[convert-to-pdf] Fetching DOCX from storage...");
    
    // First get the document metadata
    const { data: docData, error: docError } = await supabase
      .from("generated_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !docData) {
      throw new Error(`Document not found: ${document_id}`);
    }

    // Check if we have the DOCX file path
    const docxPath = docData.output_storage_path;
    if (!docxPath) {
      throw new Error("No DOCX file found for this document. Generate DOCX first.");
    }

    // Download DOCX from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("generated-documents")
      .download(docxPath);

    if (downloadError || !fileData) {
      console.error("[convert-to-pdf] Download error:", downloadError);
      throw new Error(`Failed to download DOCX: ${downloadError?.message}`);
    }

    console.log(`[convert-to-pdf] DOCX downloaded: ${fileData.size} bytes`);

    // 4. Upload file to iLovePDF
    console.log("[convert-to-pdf] Uploading to iLovePDF...");
    const formData = new FormData();
    formData.append("task", task);
    formData.append("file", new Blob([await fileData.arrayBuffer()]), "document.docx");

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

    // 5. Process conversion
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
        files: [{ server_filename: uploadData.server_filename, filename: "document.docx" }],
      }),
    });

    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error("[convert-to-pdf] Process failed:", errorText);
      throw new Error(`Process failed: ${processResponse.status}`);
    }

    console.log("[convert-to-pdf] Conversion processed");

    // 6. Download converted PDF
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

    const pdfBlob = await downloadResponse.blob();
    console.log(`[convert-to-pdf] PDF downloaded: ${pdfBlob.size} bytes`);

    // 7. Upload PDF to Supabase storage
    const pdfPath = docxPath.replace(".docx", ".pdf");
    console.log(`[convert-to-pdf] Uploading PDF to storage: ${pdfPath}`);

    const { error: uploadStorageError } = await supabase.storage
      .from("generated-documents")
      .upload(pdfPath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadStorageError) {
      console.error("[convert-to-pdf] Storage upload error:", uploadStorageError);
      throw new Error(`Failed to save PDF: ${uploadStorageError.message}`);
    }

    // 8. Get public URL
    const { data: urlData } = supabase.storage
      .from("generated-documents")
      .getPublicUrl(pdfPath);

    console.log(`[convert-to-pdf] PDF saved successfully: ${urlData.publicUrl}`);

    // 9. Update document metadata
    await supabase
      .from("generated_documents")
      .update({
        output_format: "pdf",
        updated_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: urlData.publicUrl,
        pdf_path: pdfPath,
        file_size: pdfBlob.size,
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
