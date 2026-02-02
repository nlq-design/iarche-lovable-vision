import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM } from "../_shared/ai-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  file_id: string;
  force_reprocess?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { file_id, force_reprocess = false }: ProcessRequest = await req.json();

    if (!file_id) {
      return new Response(JSON.stringify({ error: "file_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-uploaded-file] Processing file: ${file_id}`);

    // Fetch file metadata
    const { data: file, error: fileError } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("id", file_id)
      .maybeSingle();

    if (fileError || !file) {
      console.error("[process-uploaded-file] File not found:", fileError);
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already processed
    if (file.processing_status === "completed" && !force_reprocess) {
      console.log("[process-uploaded-file] File already processed, skipping");
      return new Response(JSON.stringify({ success: true, message: "Already processed", file }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const processingStartedAt = new Date().toISOString();

    // Update status to processing
    await supabase
      .from("uploaded_files")
      .update({
        processing_status: "processing",
        processing_error: null,
        processing_started_at: processingStartedAt,
        processing_completed_at: null,
      })
      .eq("id", file_id);

    let extractedContent = file.extracted_content || "";
    let ocrRequired = false;
    let ocrProvider: string | null = null;
    let ocrConfidence: number | null = null;

    const mimeType = file.mime_type || "";

    // Extract content based on MIME type
    if (!extractedContent && (mimeType === "text/plain" || mimeType.startsWith("text/"))) {
      // For text files, download and read directly
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("cockpit-uploads")
        .download(file.storage_path);

      if (!downloadError && fileData) {
        extractedContent = await fileData.text();
        console.log(`[process-uploaded-file] Extracted ${extractedContent.length} chars from text file`);
      }
    } else if (!extractedContent && mimeType.includes("wordprocessingml")) {
      // DOCX files - use LLM vision to extract (convert to base64 and send to AI)
      console.log("[process-uploaded-file] DOCX detected, using LLM extraction");
      const docxResult = await extractDocxViaLLM(supabase, file);
      if (docxResult.success) {
        extractedContent = docxResult.text;
        ocrProvider = docxResult.provider ?? null;
        console.log(`[process-uploaded-file] DOCX extracted ${extractedContent.length} chars via ${ocrProvider}`);
      } else {
        console.warn("[process-uploaded-file] DOCX extraction failed:", docxResult.error);
      }
    } else if (!extractedContent && (mimeType === "application/pdf" || mimeType.startsWith("image/"))) {
      // For PDFs and images, use OCR via LLM Vision
      ocrRequired = true;
      const ocrResult = await performOCR(supabase, { ...file, mime_type: mimeType });
      if (ocrResult.success) {
        extractedContent = ocrResult.text;
        ocrProvider = ocrResult.provider ?? null;
        ocrConfidence = ocrResult.confidence ?? null;
        console.log(`[process-uploaded-file] OCR extracted ${extractedContent.length} chars via ${ocrProvider}`);
      } else {
        console.warn("[process-uploaded-file] OCR failed:", ocrResult.error);
      }
    }

    // Generate AI summary and metadata if we have content
    let aiSummary: string | null = null;
    let aiTags: string[] = [];
    let aiKeyPoints: object[] = [];

    if (extractedContent && extractedContent.length > 50) {
      const analysisResult = await analyzeContent(extractedContent, file.original_filename);
      if (analysisResult.success) {
        aiSummary = analysisResult.summary ?? null;
        aiTags = analysisResult.tags ?? [];
        aiKeyPoints = analysisResult.keyPoints ?? [];
        console.log(
          `[process-uploaded-file] AI analysis complete: ${aiTags.length} tags, ${aiKeyPoints.length} key points`,
        );
      }
    }

    // Update file with extracted data
    const mergedAiMetadata = {
      ...(file.ai_metadata || {}),
      ai_tags: aiTags,
      ai_key_points: aiKeyPoints,
    };

    const { error: updateError } = await supabase
      .from("uploaded_files")
      .update({
        extracted_content: extractedContent.substring(0, 100000), // Limit to 100k chars
        ai_summary: aiSummary,
        ai_metadata: mergedAiMetadata,
        ocr_required: ocrRequired,
        ocr_provider: ocrProvider,
        ocr_confidence: ocrConfidence,
        processing_status: "completed",
        processing_completed_at: new Date().toISOString(),
      })
      .eq("id", file_id);

    if (updateError) {
      console.error("[process-uploaded-file] Update error:", updateError);
      throw updateError;
    }

    console.log(`[process-uploaded-file] Successfully processed file: ${file_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        file_id,
        content_length: extractedContent.length,
        has_summary: !!aiSummary,
        tags_count: aiTags.length,
        ocr_used: ocrRequired,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("[process-uploaded-file] Error:", error);

    // Supabase client errors are often plain objects
    const message = error instanceof Error
      ? error.message
      : (typeof error === "object" && error && "message" in error)
      ? String((error as any).message)
      : "Processing failed";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Extract text from DOCX files using Lovable AI Gateway
async function extractDocxViaLLM(
  supabase: any,
  file: any,
): Promise<{ success: boolean; text: string; provider?: string; error?: string }> {
  try {
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("cockpit-uploads")
      .download(file.storage_path);

    if (downloadError || !fileData) {
      return { success: false, text: "", error: "Failed to download DOCX file" };
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Use Lovable AI Gateway (Gemini supports file inputs better for DOCX)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "Tu es un expert en extraction de contenu documentaire. Extrais tout le texte du document avec précision, en conservant la structure (titres, paragraphes, listes, tableaux). Retourne uniquement le texte extrait, sans commentaires ni formatage markdown.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extrais tout le contenu texte de ce fichier DOCX (${file.original_filename}). Le fichier est encodé en base64:`,
                  },
                  {
                    type: "file",
                    file: {
                      filename: file.original_filename,
                      file_data: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.choices?.[0]?.message?.content || "";
          if (text.length > 50) {
            return { success: true, text, provider: "lovable-gemini" };
          }
        } else {
          console.warn("[DOCX] Lovable AI failed:", await response.text());
        }
      } catch (e) {
        console.warn("[DOCX] Lovable AI error:", e);
      }
    }

    // Fallback to OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (openaiKey) {
      try {
        // OpenAI doesn't support DOCX directly, but we can ask it to describe
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Tu reçois le contenu base64 d'un fichier DOCX. Tente de l'interpréter et d'en extraire le texte lisible. Si le contenu est trop corrompu, indique-le.",
              },
              {
                role: "user",
                content: `Fichier: ${file.original_filename}\nContenu base64 (tronqué): ${base64.substring(0, 8000)}...`,
              },
            ],
            max_tokens: 4096,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.choices?.[0]?.message?.content || "";
          return { success: true, text, provider: "openai-fallback" };
        }
      } catch (e) {
        console.warn("[DOCX] OpenAI fallback error:", e);
      }
    }

    return { success: false, text: "", error: "No AI provider available for DOCX extraction" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "DOCX extraction failed";
    return { success: false, text: "", error: message };
  }
}

async function performOCR(supabase: any, file: any): Promise<{ success: boolean; text: string; provider?: string; confidence?: number; error?: string }> {
  try {
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cockpit-uploads')
      .download(file.storage_path);

    if (downloadError || !fileData) {
      return { success: false, text: '', error: 'Failed to download file' };
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = file.file_type || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Try OpenAI first
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'Tu es un expert en OCR. Extrais tout le texte visible du document/image avec une haute précision. Conserve la structure (titres, paragraphes, listes). Retourne uniquement le texte extrait, sans commentaires.'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Extrais tout le texte de ce document:' },
                  { type: 'image_url', image_url: { url: dataUrl } }
                ]
              }
            ],
            max_tokens: 4096,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.choices?.[0]?.message?.content || '';
          return { success: true, text, provider: 'openai-gpt4o', confidence: 0.95 };
        }
      } catch (e) {
        console.warn('[OCR] OpenAI failed:', e);
      }
    }

    // Fallback to Anthropic
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: { type: 'base64', media_type: mimeType, data: base64 }
                  },
                  {
                    type: 'text',
                    text: 'Extrais tout le texte visible de ce document avec précision. Conserve la structure. Retourne uniquement le texte, sans commentaires.'
                  }
                ]
              }
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const text = result.content?.[0]?.text || '';
          return { success: true, text, provider: 'anthropic-claude', confidence: 0.93 };
        }
      } catch (e) {
        console.warn('[OCR] Anthropic failed:', e);
      }
    }

    return { success: false, text: '', error: 'No OCR provider available' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OCR failed';
    return { success: false, text: '', error: message };
  }
}

async function analyzeContent(content: string, filename: string): Promise<{ success: boolean; summary?: string; tags?: string[]; keyPoints?: object[]; error?: string }> {
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

    const prompt = `Analyse ce document (${filename}) et fournis:
1. Un résumé concis (2-3 phrases)
2. 3-5 tags pertinents (mots-clés)
3. Les points clés sous forme de liste

Document:
${content.substring(0, 8000)}

Réponds en JSON:
{
  "summary": "...",
  "tags": ["tag1", "tag2"],
  "keyPoints": [{"title": "...", "description": "..."}]
}`;

    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Tu es un assistant d\'analyse documentaire. Réponds toujours en JSON valide.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 1024,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const parsed = JSON.parse(result.choices?.[0]?.message?.content || '{}');
        return {
          success: true,
          summary: parsed.summary || null,
          tags: parsed.tags || [],
          keyPoints: parsed.keyPoints || []
        };
      }
    }

    if (anthropicKey) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.content?.[0]?.text || '{}';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            summary: parsed.summary || null,
            tags: parsed.tags || [],
            keyPoints: parsed.keyPoints || []
          };
        }
      }
    }

    return { success: false, error: 'No AI provider available' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return { success: false, error: message };
  }
}
