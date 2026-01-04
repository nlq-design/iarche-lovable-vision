import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Allowed Telegram user IDs (configure these for security)
const ALLOWED_USERS: number[] = []; // Empty = allow all, or add specific user IDs

// Max file size for Telegram files (20MB)
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// Typing action interval (Telegram resets after ~5 seconds)
const TYPING_INTERVAL_MS = 4000;

// Supabase client for deduplication
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  caption?: string; // Caption for audio/voice/document messages
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    mime_type?: string;
    file_size?: number;
  };
  document?: {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// =============================================================================
// DEDUPLICATION - Prevents Telegram retries from causing duplicate actions
// =============================================================================

async function isUpdateAlreadyProcessed(updateId: number): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("telegram_processed_updates")
      .select("update_id, status")
      .eq("update_id", updateId)
      .maybeSingle();

    if (error) {
      console.error("Error checking dedup:", error);
      return false; // Fail-open: process if we can't check
    }

    return data !== null;
  } catch (err) {
    console.error("Dedup check failed:", err);
    return false;
  }
}

async function markUpdateAsProcessing(updateId: number, chatId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("telegram_processed_updates")
      .insert({
        update_id: updateId,
        chat_id: chatId,
        status: "processing",
      });

    if (error) {
      // Unique constraint violation = already being processed
      if (error.code === "23505") {
        console.log(`Update ${updateId} already being processed (concurrent request)`);
        return false;
      }
      console.error("Error marking as processing:", error);
    }
    return !error;
  } catch (err) {
    console.error("Mark processing failed:", err);
    return false;
  }
}

async function markUpdateAsCompleted(updateId: number, responsePreview?: string): Promise<void> {
  try {
    await supabase
      .from("telegram_processed_updates")
      .update({
        status: "completed",
        response_preview: responsePreview?.slice(0, 200),
        processed_at: new Date().toISOString(),
      })
      .eq("update_id", updateId);
  } catch (err) {
    console.error("Mark completed failed:", err);
  }
}

async function markUpdateAsFailed(updateId: number, error?: string): Promise<void> {
  try {
    await supabase
      .from("telegram_processed_updates")
      .update({
        status: "failed",
        response_preview: error?.slice(0, 200),
        processed_at: new Date().toISOString(),
      })
      .eq("update_id", updateId);
  } catch (err) {
    console.error("Mark failed failed:", err);
  }
}

// =============================================================================
// TELEGRAM HELPERS
// =============================================================================

async function sendTelegramMessage(chatId: number, text: string, parseMode: string = "Markdown"): Promise<void> {
  try {
    // Truncate long messages (Telegram limit is 4096 chars)
    const maxLength = 4000;
    const truncatedText = text.length > maxLength 
      ? text.slice(0, maxLength) + "\n\n_... (message tronqué)_"
      : text;

    console.log("Sending message to chat:", chatId, "Text length:", truncatedText.length);

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: truncatedText,
        parse_mode: parseMode,
      }),
    });

    const result = await response.json();
    console.log("Telegram API response:", JSON.stringify(result));
    
    // If Markdown parsing fails, retry without parse_mode
    if (!result.ok && result.description?.includes("parse")) {
      console.log("Markdown parsing failed, retrying as plain text");
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncatedText,
        }),
      });
    }
    
    // Log failed sends to database for monitoring
    if (!result.ok) {
      await logTelegramError(chatId, "send_message", result.description || "Unknown error");
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    await logTelegramError(chatId, "send_message", error instanceof Error ? error.message : String(error));
  }
}

async function sendTypingAction(chatId: number): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    });
  } catch (error) {
    console.error("Error sending typing action:", error);
  }
}

// Typing loop - maintains "typing" indicator during long operations
function startTypingLoop(chatId: number): { stop: () => void } {
  let isRunning = true;
  
  const loop = async () => {
    while (isRunning) {
      await sendTypingAction(chatId);
      await new Promise(resolve => setTimeout(resolve, TYPING_INTERVAL_MS));
    }
  };
  
  loop().catch(err => console.error("Typing loop error:", err));
  
  return {
    stop: () => { isRunning = false; }
  };
}

// Log Telegram errors to database for monitoring
async function logTelegramError(chatId: number, errorType: string, errorMessage: string): Promise<void> {
  try {
    await supabase.from("email_logs").insert({
      email_type: "telegram_error",
      recipient_email: `telegram_${chatId}`,
      subject: errorType,
      status: "failed",
      error_message: errorMessage.slice(0, 500),
      source_type: "telegram",
      metadata: { chat_id: chatId, error_type: errorType }
    });
  } catch (err) {
    console.error("Failed to log Telegram error:", err);
  }
}

// Cleanup old processed updates (called periodically)
async function cleanupOldUpdates(): Promise<void> {
  try {
    const { error } = await supabase.rpc("cleanup_old_telegram_updates");
    if (error) {
      console.error("Cleanup error:", error);
    } else {
      console.log("Old Telegram updates cleaned up");
    }
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
}

// =============================================================================
// AI AGENT CALL - With timeout and fast mode for Telegram
// =============================================================================

async function callAIAgent(message: string, userId: number, userName: string): Promise<string> {
  console.log("Calling AI agent with message:", message);
  
  // Telegram-specific timeout (25s to stay under Edge Function limits)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    // Format messages array as expected by the orchestrator
    const messagesPayload = [
      { role: "user", content: message }
    ];

    // Call the AI agent orchestrator with telegram-specific settings
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-agent-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Internal server-to-server auth (avoids JWT requirements)
        "x-internal-token": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        messages: messagesPayload,
        source: "telegram",
        // ai_agent_memory.user_id expects UUID; keep null for Telegram
        user_id: null,
        session_id: `telegram_session_${userId}`,
        workspace_id: null, // Telegram uses global workspace
        // Telegram-specific: request faster response
        telegram_fast_mode: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("AI Agent response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Agent error:", response.status, errorText);
      
      if (response.status === 504) {
        return "⚠️ La demande a pris trop de temps. Je l'ai traitée en arrière-plan. Réessayez dans quelques secondes ou reformulez votre demande plus simplement.";
      }
      
      return `❌ Erreur (${response.status}): ${errorText.slice(0, 200)}`;
    }

    const data = await response.json();
    console.log("AI Agent data keys:", Object.keys(data));
    console.log("AI Agent data:", JSON.stringify(data).slice(0, 500));
    
    // The orchestrator returns { ok, message, tool_calls, ... }
    const responseText = data.message || data.response || data.text || data.content;
    
    if (!responseText) {
      console.error("No response field found in:", Object.keys(data));
      return "⚠️ Réponse reçue mais format inattendu: " + JSON.stringify(data).slice(0, 200);
    }
    
    return responseText;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === "AbortError") {
      console.log("AI Agent call timed out after 25s");
      return "⚠️ La demande prend plus de temps que prévu. Je continue le traitement. Réessayez dans quelques secondes.";
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error calling AI agent:", errorMessage);
    return `❌ Erreur: ${errorMessage}`;
  }
}

// =============================================================================
// AUDIO FILE HANDLING - Download from Telegram
// =============================================================================

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  try {
    const response = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const data = await response.json();
    
    if (!data.ok || !data.result?.file_path) {
      console.error("Failed to get file path:", data);
      return null;
    }
    
    return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${data.result.file_path}`;
  } catch (error) {
    console.error("Error getting file URL:", error);
    return null;
  }
}

async function downloadTelegramFile(fileUrl: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error("Failed to download file:", response.status);
      return null;
    }
    
    // Check file size from Content-Length header
    const contentLength = response.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
      console.error("File too large:", contentLength, "bytes");
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    
    // Double-check actual size
    if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      console.error("Downloaded file too large:", buffer.byteLength, "bytes");
      return null;
    }
    
    return buffer;
  } catch (error) {
    console.error("Error downloading file:", error);
    return null;
  }
}

async function uploadToSupabaseStorage(
  fileBuffer: ArrayBuffer,
  fileName: string,
  mimeType: string
): Promise<string | null> {
  try {
    // Validate file size before upload
    if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      console.error("File exceeds size limit:", fileBuffer.byteLength, "bytes");
      return null;
    }
    
    const filePath = `telegram-audio/${Date.now()}_${fileName}`;
    
    const { data, error } = await supabase.storage
      .from("cockpit-uploads")
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }
    
    return data.path;
  } catch (error) {
    console.error("Error uploading to storage:", error);
    return null;
  }
}

async function createTranscriptionJob(
  storagePath: string,
  source: string,
  userId: number,
  userName: string,
  caption?: string
): Promise<{ success: boolean; transcriptionId?: string; error?: string }> {
  try {
    // Build metadata with optional caption context
    const metadata: Record<string, unknown> = {
      telegram_user_id: userId,
      telegram_username: userName,
      imported_via: "telegram_bot",
    };
    
    // Add caption as context if provided
    if (caption) {
      metadata.user_context = caption;
    }
    
    // Create transcription record directly (internal, no auth required)
    const { data, error } = await supabase
      .from("voice_transcriptions")
      .insert({
        title: caption ? `Telegram: ${caption.slice(0, 50)}` : `Transcription Telegram - ${userName}`,
        source: source,
        storage_path: storagePath,
        status: "pending",
        created_by: null, // No authenticated user for Telegram
        workspace_id: null,
        metadata,
      })
      .select("id")
      .single();
    
    if (error) {
      console.error("Error creating transcription:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, transcriptionId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error creating transcription job:", msg);
    return { success: false, error: msg };
  }
}

// =============================================================================
// HELP MESSAGE
// =============================================================================

function formatHelpMessage(): string {
  return `🤖 *Agent IA IArche - Telegram*

Bienvenue ! Je suis votre assistant IA pour gérer le Cockpit IArche.

*Commandes disponibles :*
• /start - Message de bienvenue
• /help - Afficher cette aide
• /leads - Voir les derniers leads
• /rdv - Voir les prochains rendez-vous
• /projets - Voir les projets actifs
• /stats - Statistiques rapides

*Fichiers audio :*
📎 Envoyez un message vocal ou un fichier audio pour créer une transcription dans le Cockpit.

*Exemples de questions :*
• "Quels sont les leads de cette semaine ?"
• "Crée une tâche pour rappeler Jean demain"
• "Résume le projet Dupont"
• "Quel est le pipeline commercial ?"

Posez simplement votre question et je vous répondrai !`;
}

// =============================================================================
// BACKGROUND PROCESSING TASK
// =============================================================================

async function processMessageInBackground(
  updateId: number,
  chatId: number,
  userId: number,
  userName: string,
  text: string
): Promise<void> {
  // Start continuous typing indicator
  const typing = startTypingLoop(chatId);
  
  try {
    // Process with AI agent
    const aiResponse = await callAIAgent(text, userId, userName);
    
    // Stop typing before sending response
    typing.stop();
    
    // Send response
    await sendTelegramMessage(chatId, aiResponse);
    
    // Mark as completed
    await markUpdateAsCompleted(updateId, aiResponse);
    
    // Periodically cleanup old updates (1 in 100 chance)
    if (Math.random() < 0.01) {
      cleanupOldUpdates().catch(err => console.error("Cleanup error:", err));
    }
    
  } catch (error) {
    typing.stop();
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Background processing error:", msg);
    
    await sendTelegramMessage(chatId, "❌ Je n'ai pas pu traiter votre demande. Réessayez.");
    await markUpdateAsFailed(updateId, msg);
  }
}

async function processAudioInBackground(
  updateId: number,
  chatId: number,
  userId: number,
  userName: string,
  fileId: string,
  fileName: string,
  mimeType: string,
  caption?: string,
  fileSize?: number
): Promise<void> {
  // Start continuous typing indicator
  const typing = startTypingLoop(chatId);
  
  try {
    // Check file size early if available
    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      typing.stop();
      await sendTelegramMessage(
        chatId, 
        `❌ Fichier trop volumineux (${(fileSize / 1024 / 1024).toFixed(1)} MB). Maximum: 20 MB.`
      );
      await markUpdateAsFailed(updateId, "File too large");
      return;
    }
    
    // Get file URL from Telegram
    const fileUrl = await getTelegramFileUrl(fileId);
    if (!fileUrl) {
      typing.stop();
      await sendTelegramMessage(chatId, "❌ Impossible de récupérer le fichier audio.");
      await markUpdateAsFailed(updateId, "Failed to get file URL");
      return;
    }
    
    // Download file
    const fileBuffer = await downloadTelegramFile(fileUrl);
    if (!fileBuffer) {
      typing.stop();
      await sendTelegramMessage(
        chatId, 
        "❌ Impossible de télécharger le fichier audio. Vérifiez que le fichier fait moins de 20 MB."
      );
      await markUpdateAsFailed(updateId, "Failed to download file (size limit?)");
      return;
    }
    
    // Upload to Supabase Storage
    const storagePath = await uploadToSupabaseStorage(fileBuffer, fileName, mimeType);
    if (!storagePath) {
      typing.stop();
      await sendTelegramMessage(chatId, "❌ Impossible de sauvegarder le fichier audio.");
      await markUpdateAsFailed(updateId, "Failed to upload to storage");
      return;
    }
    
    // Create transcription job with caption context
    const result = await createTranscriptionJob(storagePath, "telegram", userId, userName, caption);
    
    typing.stop();
    
    if (result.success) {
      let successMsg = `✅ Fichier audio reçu et enregistré !\n\n📝 Transcription créée (ID: \`${result.transcriptionId?.slice(0, 8)}...\`)`;
      
      if (caption) {
        successMsg += `\n📌 Contexte: "${caption.slice(0, 50)}${caption.length > 50 ? '...' : ''}"`;
      }
      
      successMsg += `\n\n➡️ Accédez au Cockpit pour voir la transcription et lancer l'analyse.`;
      
      await sendTelegramMessage(chatId, successMsg);
      await markUpdateAsCompleted(updateId, `Transcription created: ${result.transcriptionId}`);
    } else {
      await sendTelegramMessage(chatId, `❌ Erreur lors de la création de la transcription: ${result.error}`);
      await markUpdateAsFailed(updateId, result.error);
    }
    
  } catch (error) {
    typing.stop();
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Audio processing error:", msg);
    
    await sendTelegramMessage(chatId, "❌ Erreur lors du traitement de l'audio.");
    await markUpdateAsFailed(updateId, msg);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight requests (useful for debugging from a browser)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Debug / health endpoint
  if (req.method === "GET") {
    const url = new URL(req.url);
    const debug = url.searchParams.get("debug") === "1";
    const setup = url.searchParams.get("setup") === "1";

    if (!debug && !setup) {
      return new Response("Telegram webhook is active", { status: 200, headers: corsHeaders });
    }

    try {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
      let setupJson: unknown = null;

      if (setup) {
        const setupResp = await fetch(`${TELEGRAM_API}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            drop_pending_updates: true,
          }),
        });
        setupJson = await setupResp.json();
      }

      const [meResp, hookResp] = await Promise.all([
        fetch(`${TELEGRAM_API}/getMe`),
        fetch(`${TELEGRAM_API}/getWebhookInfo`),
      ]);

      const meJson = await meResp.json();
      const hookJson = await hookResp.json();

      return new Response(
        JSON.stringify(
          {
            ok: true,
            setup_requested: setup,
            setup_result: setupJson,
            expected_webhook_url: webhookUrl,
            bot_ok: !!meJson?.ok,
            bot: meJson?.result
              ? {
                  id: meJson.result.id,
                  username: meJson.result.username,
                  first_name: meJson.result.first_name,
                  can_join_groups: meJson.result.can_join_groups,
                  can_read_all_group_messages: meJson.result.can_read_all_group_messages,
                  supports_inline_queries: meJson.result.supports_inline_queries,
                }
              : null,
            webhook_ok: !!hookJson?.ok,
            webhook: hookJson?.result
              ? {
                  url: hookJson.result.url,
                  has_custom_certificate: hookJson.result.has_custom_certificate,
                  pending_update_count: hookJson.result.pending_update_count,
                  last_error_date: hookJson.result.last_error_date,
                  last_error_message: hookJson.result.last_error_message,
                  max_connections: hookJson.result.max_connections,
                  ip_address: hookJson.result.ip_address,
                }
              : null,
          },
          null,
          2,
        ),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("[telegram-webhook] debug_error:", error);
      return new Response(JSON.stringify({ ok: false, error: "debug_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const update: TelegramUpdate = await req.json();
    console.log("Received Telegram update:", update.update_id);

    const message = update.message;
    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const userName = message.from.first_name + (message.from.last_name ? ` ${message.from.last_name}` : "");
    const updateId = update.update_id;

    // =========================================================================
    // DEDUPLICATION CHECK - Critical to prevent Telegram retry loops
    // =========================================================================
    
    // Check if this update was already processed
    const alreadyProcessed = await isUpdateAlreadyProcessed(updateId);
    if (alreadyProcessed) {
      console.log(`Update ${updateId} already processed, ignoring duplicate`);
      return new Response("OK", { status: 200 });
    }

    // Try to claim this update for processing
    const claimed = await markUpdateAsProcessing(updateId, chatId);
    if (!claimed) {
      console.log(`Update ${updateId} claimed by another instance, ignoring`);
      return new Response("OK", { status: 200 });
    }

    // Security check: only allow specific users if configured
    if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
      await sendTelegramMessage(chatId, "⛔ Accès non autorisé. Contactez l'administrateur.");
      await markUpdateAsCompleted(updateId, "Unauthorized user");
      return new Response("OK", { status: 200 });
    }

    // =========================================================================
    // HANDLE AUDIO/VOICE MESSAGES
    // =========================================================================
    
    if (message.voice) {
      // Quick acknowledgment
      await sendTelegramMessage(chatId, "🎤 Message vocal reçu. Import en cours...");
      
      // Process in background (fire-and-forget pattern)
      const fileName = `voice_${Date.now()}.ogg`;
      const mimeType = message.voice.mime_type || "audio/ogg";
      
      // Don't await - let it run in background (with caption and file_size)
      processAudioInBackground(
        updateId, chatId, userId, userName, 
        message.voice.file_id, fileName, mimeType,
        message.caption, message.voice.file_size
      ).catch(err => console.error("Background audio processing error:", err));
      
      return new Response("OK", { status: 200 });
    }
    
    if (message.audio) {
      // Quick acknowledgment
      await sendTelegramMessage(chatId, "🎵 Fichier audio reçu. Import en cours...");
      
      const fileName = message.audio.title || `audio_${Date.now()}.mp3`;
      const mimeType = message.audio.mime_type || "audio/mpeg";
      
      // Don't await - let it run in background (with caption and file_size)
      processAudioInBackground(
        updateId, chatId, userId, userName,
        message.audio.file_id, fileName, mimeType,
        message.caption, message.audio.file_size
      ).catch(err => console.error("Background audio processing error:", err));
      
      return new Response("OK", { status: 200 });
    }
    
    if (message.document && message.document.mime_type?.startsWith("audio/")) {
      // Quick acknowledgment
      await sendTelegramMessage(chatId, "📎 Document audio reçu. Import en cours...");
      
      const fileName = message.document.file_name || `document_${Date.now()}`;
      const mimeType = message.document.mime_type;
      
      // Don't await - let it run in background (with caption and file_size)
      processAudioInBackground(
        updateId, chatId, userId, userName,
        message.document.file_id, fileName, mimeType,
        message.caption, message.document.file_size
      ).catch(err => console.error("Background audio processing error:", err));
      
      return new Response("OK", { status: 200 });
    }

    // =========================================================================
    // HANDLE TEXT MESSAGES
    // =========================================================================
    
    const text = message.text?.trim();
    if (!text) {
      await markUpdateAsCompleted(updateId, "No text content");
      return new Response("OK", { status: 200 });
    }

    // Handle commands (fast, no background needed)
    if (text.startsWith("/")) {
      const command = text.split(" ")[0].toLowerCase();
      
      switch (command) {
        case "/start":
          await sendTelegramMessage(chatId, `Bonjour ${userName} ! 👋\n\n${formatHelpMessage()}`);
          await markUpdateAsCompleted(updateId, "/start command");
          return new Response("OK", { status: 200 });
          
        case "/help":
          await sendTelegramMessage(chatId, formatHelpMessage());
          await markUpdateAsCompleted(updateId, "/help command");
          return new Response("OK", { status: 200 });
          
        case "/leads":
          await sendTelegramMessage(chatId, "⏳ Récupération des leads...");
          processMessageInBackground(updateId, chatId, userId, userName, "Liste les 5 derniers leads avec leur statut")
            .catch(err => console.error("Background processing error:", err));
          return new Response("OK", { status: 200 });
          
        case "/rdv":
          await sendTelegramMessage(chatId, "⏳ Récupération des rendez-vous...");
          processMessageInBackground(updateId, chatId, userId, userName, "Quels sont les prochains rendez-vous cette semaine ?")
            .catch(err => console.error("Background processing error:", err));
          return new Response("OK", { status: 200 });
          
        case "/projets":
          await sendTelegramMessage(chatId, "⏳ Récupération des projets...");
          processMessageInBackground(updateId, chatId, userId, userName, "Liste les projets actifs avec leur statut")
            .catch(err => console.error("Background processing error:", err));
          return new Response("OK", { status: 200 });
          
        case "/stats":
          await sendTelegramMessage(chatId, "⏳ Calcul des statistiques...");
          processMessageInBackground(updateId, chatId, userId, userName, "Donne-moi un résumé rapide des statistiques : nombre de leads, opportunités, projets")
            .catch(err => console.error("Background processing error:", err));
          return new Response("OK", { status: 200 });
          
        default:
          // Unknown command, treat as regular message
          break;
      }
    }

    // =========================================================================
    // REGULAR MESSAGE - Process in background
    // =========================================================================
    
    // Quick immediate acknowledgment BEFORE processing
    await sendTelegramMessage(chatId, "⏳ Reçu. Je traite votre demande…");

    // Process with AI agent in background (fire-and-forget)
    processMessageInBackground(updateId, chatId, userId, userName, text)
      .catch(err => console.error("Background processing error:", err));

    // Return immediately to Telegram (prevents retries)
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
