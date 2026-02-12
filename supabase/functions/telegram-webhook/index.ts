import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackAPIUsage } from "../_shared/api-tracker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Allowed Telegram user IDs - retrieved from secret or hardcoded for known admins
// TELEGRAM_ADMIN_CHAT_ID contains the authorized admin chat ID
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
const ALLOWED_USERS: number[] = TELEGRAM_ADMIN_CHAT_ID 
  ? TELEGRAM_ADMIN_CHAT_ID.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
  : [];

// Security: Reject if no allowed users configured
const REQUIRE_USER_WHITELIST = true;

// Max file size for Telegram files (50MB - Supabase storage limit)
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Typing action interval (Telegram resets after ~5 seconds)
const TYPING_INTERVAL_MS = 4000;

// Default workspace for API tracking
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

// Supabase client for deduplication
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let cachedTelegramSystemUserId: string | null = null;

async function getTelegramSystemUserId(): Promise<string> {
  if (cachedTelegramSystemUserId) return cachedTelegramSystemUserId;

  // Prefer the default workspace owner
  const { data: owner, error: ownerError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownerError) {
    console.error("Error fetching default workspace owner:", ownerError);
  }

  if (owner?.user_id) {
    cachedTelegramSystemUserId = owner.user_id;
    return owner.user_id;
  }

  // Fallback: any admin user
  const { data: admin, error: adminError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (adminError) {
    console.error("Error fetching admin user:", adminError);
  }

  if (admin?.user_id) {
    cachedTelegramSystemUserId = admin.user_id;
    return admin.user_id;
  }

  throw new Error("no_system_user_configured");
}

// =============================================================================
// INTERFACES
// =============================================================================

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
  caption?: string;
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
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: TelegramMessage;
    data?: string;
    chat_instance: string;
  };
}

interface InlineButton {
  text: string;
  callback_data: string;
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
      return false;
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
// STATS TRACKING
// =============================================================================

async function trackTelegramStat(
  chatId: number,
  userName: string | undefined,
  messageType: string,
  commandName: string | null,
  processingTimeMs: number | null,
  status: "success" | "failed" | "timeout",
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from("telegram_stats").insert({
      chat_id: chatId,
      user_name: userName,
      message_type: messageType,
      command_name: commandName,
      processing_time_ms: processingTimeMs,
      status,
      error_message: errorMessage?.slice(0, 500),
    });

    // Also track in unified API metrics
    await trackAPIUsage({
      workspaceId: DEFAULT_WORKSPACE_ID,
      apiName: 'telegram',
      apiCategory: 'messaging',
      operationType: commandName || messageType,
      providerName: 'telegram',
      latencyMs: processingTimeMs || undefined,
      success: status === 'success',
      errorMessage: status !== 'success' ? errorMessage?.slice(0, 200) : undefined,
      metadata: { chat_id: chatId, user_name: userName },
    });
  } catch (err) {
    console.error("Failed to track Telegram stat:", err);
  }
}

// =============================================================================
// TELEGRAM HELPERS
// =============================================================================

async function sendTelegramMessage(
  chatId: number, 
  text: string, 
  parseMode: string = "Markdown",
  replyMarkup?: { inline_keyboard: InlineButton[][] }
): Promise<void> {
  try {
    const maxLength = 4000;
    const truncatedText = text.length > maxLength 
      ? text.slice(0, maxLength) + "\n\n_... (message tronqué)_"
      : text;

    console.log("Sending message to chat:", chatId, "Text length:", truncatedText.length);

    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: truncatedText,
      parse_mode: parseMode,
    };
    
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log("Telegram API response:", JSON.stringify(result));
    
    if (!result.ok && result.description?.includes("parse")) {
      console.log("Markdown parsing failed, retrying as plain text");
      delete body.parse_mode;
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    
    if (!result.ok) {
      await logTelegramError(chatId, "send_message", result.description || "Unknown error");
    }
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    await logTelegramError(chatId, "send_message", error instanceof Error ? error.message : String(error));
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text?.slice(0, 200),
      }),
    });
  } catch (error) {
    console.error("Error answering callback query:", error);
  }
}

async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  parseMode: string = "Markdown"
): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: parseMode,
      }),
    });
    const result = await response.json();
    if (!result.ok && result.description?.includes("parse")) {
      await fetch(`${TELEGRAM_API}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
        }),
      });
    }
  } catch (error) {
    console.error("Error editing Telegram message:", error);
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
// INLINE BUTTONS - Quick actions after AI responses
// =============================================================================

function getQuickActionButtons(context: string): { inline_keyboard: InlineButton[][] } {
  const buttons: InlineButton[][] = [];
  
  if (context.includes("lead") || context.includes("Lead")) {
    buttons.push([
      { text: "📋 Voir leads", callback_data: "action:leads" },
      { text: "➕ Créer tâche", callback_data: "action:create_task" },
    ]);
  } else if (context.includes("projet") || context.includes("Projet")) {
    buttons.push([
      { text: "📁 Voir projets", callback_data: "action:projects" },
      { text: "📝 Notes", callback_data: "action:notes" },
    ]);
  } else if (context.includes("rdv") || context.includes("RDV") || context.includes("rendez-vous")) {
    buttons.push([
      { text: "📅 Prochains RDV", callback_data: "action:rdv" },
      { text: "📞 Appeler", callback_data: "action:call" },
    ]);
  }
  
  // Always add help button if no specific context
  if (buttons.length === 0) {
    buttons.push([
      { text: "📊 Stats", callback_data: "action:stats" },
      { text: "❓ Aide", callback_data: "action:help" },
    ]);
  }
  
  return { inline_keyboard: buttons };
}

// =============================================================================
// REMINDER PARSING - /rappel command
// =============================================================================

interface ParsedReminder {
  text: string;
  remindAt: Date;
}

function parseReminderCommand(input: string): ParsedReminder | null {
  // Format: /rappel 14h Appeler Jean
  // Format: /rappel demain 10h Envoyer devis
  // Format: /rappel 30m Vérifier email
  
  const parts = input.replace(/^\/rappel\s*/i, "").trim();
  if (!parts) return null;
  
  const now = new Date();
  let remindAt = new Date(now);
  let textStart = 0;
  
  // Check for "demain"
  if (parts.toLowerCase().startsWith("demain")) {
    remindAt.setDate(remindAt.getDate() + 1);
    textStart = 7;
  }
  
  // Check for time patterns
  const timeMatch = parts.slice(textStart).match(/^(\d{1,2})h(\d{2})?\s*/i);
  const minuteMatch = parts.slice(textStart).match(/^(\d+)m\s*/i);
  
  if (timeMatch) {
    remindAt.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2] || "0"), 0, 0);
    textStart += timeMatch[0].length;
  } else if (minuteMatch) {
    remindAt = new Date(now.getTime() + parseInt(minuteMatch[1]) * 60 * 1000);
    textStart += minuteMatch[0].length;
  } else if (textStart === 0) {
    // No time specified, default to 1 hour from now
    remindAt = new Date(now.getTime() + 60 * 60 * 1000);
  }
  
  const text = parts.slice(textStart).trim();
  if (!text) return null;
  
  // Ensure reminder is in the future
  if (remindAt <= now) {
    remindAt.setDate(remindAt.getDate() + 1);
  }
  
  return { text, remindAt };
}

async function createReminder(
  chatId: number, 
  userId: number, 
  userName: string, 
  text: string, 
  remindAt: Date
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("telegram_reminders")
      .insert({
        chat_id: chatId,
        user_id: userId,
        user_name: userName,
        reminder_text: text,
        remind_at: remindAt.toISOString(),
        status: "pending",
      })
      .select("id")
      .single();
    
    if (error) {
      console.error("Error creating reminder:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// =============================================================================
// CONTEXTUAL LINKING - Link audio to lead/project from caption
// =============================================================================

async function findEntityFromCaption(caption: string): Promise<{ 
  leadId?: string; 
  projectId?: string; 
  leadName?: string;
  projectName?: string;
}> {
  const result: { leadId?: string; projectId?: string; leadName?: string; projectName?: string } = {};
  
  // Search for leads by name in caption
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, company")
    .limit(10);
  
  if (leads) {
    for (const lead of leads) {
      const searchTerms = [lead.name];
      if (lead.company) searchTerms.push(lead.company);
      
      for (const term of searchTerms) {
        if (term && caption.toLowerCase().includes(term.toLowerCase())) {
          result.leadId = lead.id;
          result.leadName = lead.name;
          break;
        }
      }
      if (result.leadId) break;
    }
  }
  
  // Search for projects by name in caption
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .limit(10);
  
  if (projects) {
    for (const project of projects) {
      if (project.name && caption.toLowerCase().includes(project.name.toLowerCase())) {
        result.projectId = project.id;
        result.projectName = project.name;
        break;
      }
    }
  }
  
  return result;
}

// =============================================================================
// CONVERSATION CONTEXT - Persistent memory for multi-message conversations
// =============================================================================

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

async function getConversationHistory(chatId: number): Promise<ConversationMessage[]> {
  try {
    // Clean up expired context first (occasionally)
    if (Math.random() < 0.05) {
      supabase.rpc("cleanup_old_telegram_context").then(() => {}, () => {});
    }

    const { data, error } = await supabase
      .from("telegram_conversation_context")
      .select("role, content")
      .eq("chat_id", chatId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10); // Last 10 messages for context

    if (error) {
      console.error("Error fetching conversation history:", error);
      return [];
    }

    return (data || []).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  } catch (err) {
    console.error("Conversation history fetch failed:", err);
    return [];
  }
}

async function saveConversationMessage(
  chatId: number,
  userId: number,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  try {
    await supabase.from("telegram_conversation_context").insert({
      chat_id: chatId,
      user_id: userId,
      role,
      content: content.slice(0, 2000), // Limit content size
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min TTL
    });
  } catch (err) {
    console.error("Failed to save conversation message:", err);
  }
}

// =============================================================================
// AI AGENT CALL - With timeout, fast mode, and conversation context
// =============================================================================

async function callAIAgent(
  message: string, 
  userId: number, 
  userName: string,
  chatId: number
): Promise<string> {
  console.log("Calling AI agent with message:", message);
  
  const controller = new AbortController();
  // Increased timeout for complex multi-tool requests (booking creation, etc.)
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    // Get conversation history for context
    const history = await getConversationHistory(chatId);
    console.log(`Found ${history.length} previous messages in conversation context`);

    // Build messages payload with history
    const messagesPayload = [
      ...history,
      { role: "user", content: message }
    ];

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-agent-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        messages: messagesPayload,
        source: "telegram",
        user_id: null,
        session_id: `telegram_chat_${chatId}`,
        workspace_id: null,
        telegram_fast_mode: true,
        telegram_chat_id: chatId,
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
      
      // Provide more detailed error messages
      if (response.status === 500 && errorText.includes("tool")) {
        return "⚠️ Une erreur s'est produite lors de l'exécution d'une action. Pouvez-vous reformuler votre demande ?";
      }
      
      return `❌ Erreur (${response.status}): ${errorText.slice(0, 200)}`;
    }

    const data = await response.json();
    console.log("AI Agent data keys:", Object.keys(data));
    
    const responseText = data.message || data.response || data.text || data.content;
    
    if (!responseText) {
      console.error("No response field found in:", Object.keys(data));
      return "⚠️ Réponse reçue mais format inattendu: " + JSON.stringify(data).slice(0, 200);
    }
    
    // Save both user message and assistant response to context
    await saveConversationMessage(chatId, userId, "user", message);
    await saveConversationMessage(chatId, userId, "assistant", responseText);
    
    return responseText;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === "AbortError") {
      console.log("AI Agent call timed out after 45s");
      return "⚠️ La demande prend plus de temps que prévu. Je continue le traitement. Réessayez dans quelques secondes.";
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error calling AI agent:", errorMessage);
    return `❌ Erreur: ${errorMessage}`;
  }
}

// =============================================================================
// FILE HANDLING - Download from Telegram
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
    
    const contentLength = response.headers.get("Content-Length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
      console.error("File too large:", contentLength, "bytes");
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    
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
  mimeType: string,
  folder: string = "telegram-audio"
): Promise<string | null> {
  try {
    if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      console.error("File exceeds size limit:", fileBuffer.byteLength, "bytes");
      return null;
    }
    
    const filePath = `${folder}/${Date.now()}_${fileName}`;
    
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
  caption?: string,
  linkedLeadId?: string,
  linkedProjectId?: string
): Promise<{ success: boolean; transcriptionId?: string; error?: string }> {
  try {
    const metadata: Record<string, unknown> = {
      telegram_user_id: userId,
      telegram_username: userName,
      imported_via: "telegram_bot",
    };
    
    if (caption) {
      metadata.user_context = caption;
    }

    const systemUserId = await getTelegramSystemUserId();

    const { data, error } = await supabase
      .from("voice_transcriptions")
      .insert({
        title: caption ? `Telegram: ${caption.slice(0, 50)}` : `Transcription Telegram - ${userName}`,
        source: source,
        storage_path: storagePath,
        status: "queued",
        created_by: systemUserId,
        workspace_id: DEFAULT_WORKSPACE_ID,
        lead_id: linkedLeadId || null,
        project_id: linkedProjectId || null,
        ai_metadata: metadata,
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

async function createUploadedFile(
  storagePath: string,
  originalFilename: string,
  fileType: string,
  mimeType: string,
  fileSize: number,
  userId: number,
  userName: string,
  caption?: string,
  linkedLeadId?: string,
  linkedProjectId?: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    const metadata: Record<string, unknown> = {
      telegram_user_id: userId,
      telegram_username: userName,
      imported_via: "telegram_bot",
    };
    
    if (caption) {
      metadata.user_context = caption;
    }
    
    const leadIds = linkedLeadId ? [linkedLeadId] : null;
    const projectIds = linkedProjectId ? [linkedProjectId] : null;

    const systemUserId = await getTelegramSystemUserId();

    const { data, error } = await supabase
      .from("uploaded_files")
      .insert({
        original_filename: originalFilename,
        storage_path: storagePath,
        file_type: fileType,
        mime_type: mimeType,
        file_size_bytes: fileSize,
        category: "import",
        processing_status: "uploaded",
        workspace_id: DEFAULT_WORKSPACE_ID,
        uploaded_by: systemUserId,
        lead_ids: leadIds,
        project_ids: projectIds,
        ai_metadata: metadata,
      })
      .select("id")
      .single();
    
    if (error) {
      console.error("Error creating uploaded file:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true, fileId: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error creating uploaded file:", msg);
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
• /rappel - Créer un rappel

*Commande /rappel :*
• \`/rappel 14h Appeler Jean\`
• \`/rappel demain 10h Envoyer devis\`
• \`/rappel 30m Vérifier email\`

*Fichiers supportés :*
📎 Audio/Vocal → Transcription automatique
🖼️ Images → Import dans le Cockpit
📄 PDF/Documents → Import dans le Cockpit

*Astuce :* Ajoutez une légende avec le nom du lead/projet pour lier automatiquement !

*Exemples de questions :*
• "Quels sont les leads de cette semaine ?"
• "Crée une tâche pour rappeler Jean demain"
• "Résume le projet Dupont"
• "Quel est le pipeline commercial ?"

Posez simplement votre question et je vous répondrai !`;
}

// =============================================================================
// ACTION PROPOSAL HELPERS - Detect & execute proposals from Telegram
// =============================================================================

async function checkAndSendProposalButtons(chatId: number): Promise<void> {
  try {
    // Find recent proposals (last 60s) with status 'proposed' AND not yet notified via Telegram
    const cutoff = new Date(Date.now() - 60000).toISOString();
    const { data: proposals, error } = await supabase
      .from("action_proposals")
      .select("id, action_label, ai_reasoning, action_type")
      .eq("status", "proposed")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID)
      .eq("telegram_notified", false)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !proposals || proposals.length === 0) return;

    for (const proposal of proposals) {
      const text = `🤖 *Action proposée :* ${proposal.action_label}${proposal.ai_reasoning ? `\n\n💡 _Raison : ${proposal.ai_reasoning}_` : ""}`;
      
      const replyMarkup = {
        inline_keyboard: [[
          { text: "✅ Confirmer", callback_data: `action:validate:${proposal.id}` },
          { text: "❌ Rejeter", callback_data: `action:reject:${proposal.id}` },
        ]],
      };

      await sendTelegramMessage(chatId, text, "Markdown", replyMarkup);
      
      // Mark as notified to prevent re-trigger
      await supabase.from("action_proposals").update({
        telegram_notified: true,
      }).eq("id", proposal.id);
    }
  } catch (err) {
    console.error("Error checking proposals:", err);
  }
}

async function executeProposalFromTelegram(
  proposalId: string
): Promise<{ success: boolean; label: string; error?: string }> {
  try {
    // FIRST: Atomic status check before anything else (race condition guard)
    const { data: proposal, error: fetchError } = await supabase
      .from("action_proposals")
      .select("status, action_label, created_at")
      .eq("id", proposalId)
      .single();

    if (fetchError || !proposal) {
      return { success: false, label: "", error: "Proposition introuvable" };
    }

    // Race condition: check status FIRST
    if (proposal.status !== "proposed") {
      return { success: false, label: proposal.action_label, error: "already_handled" };
    }

    // Check expiration (24h)
    const createdAt = new Date(proposal.created_at).getTime();
    if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      await supabase.from("action_proposals").update({
        status: "rejected",
        validation_notes: "Expiré (>24h)",
        updated_at: new Date().toISOString(),
      }).eq("id", proposalId);
      return { success: false, label: proposal.action_label, error: "expired" };
    }

    // Mark as validated (optimistic lock — prevents double execution)
    const { data: lockResult, error: lockError } = await supabase
      .from("action_proposals")
      .update({ status: "validated", updated_at: new Date().toISOString() })
      .eq("id", proposalId)
      .eq("status", "proposed") // Only update if still proposed (atomic)
      .select("id")
      .maybeSingle();

    if (lockError || !lockResult) {
      return { success: false, label: proposal.action_label, error: "already_handled" };
    }

    // Delegate execution to the existing edge function (NO duplication)
    const systemUserId = await getTelegramSystemUserId();
    
    const execResponse = await fetch(`${SUPABASE_URL}/functions/v1/execute-action-proposal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        proposal_id: proposalId,
        source: "telegram",
      }),
    });

    if (!execResponse.ok) {
      const errText = await execResponse.text();
      // Revert to proposed if execution failed
      await supabase.from("action_proposals").update({
        status: "proposed",
        updated_at: new Date().toISOString(),
      }).eq("id", proposalId).eq("status", "validated");
      return { success: false, label: proposal.action_label, error: errText.slice(0, 200) };
    }

    const execData = await execResponse.json();
    
    return { success: true, label: proposal.action_label };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Execute proposal error:", msg);
    // Revert to proposed if execution failed
    await supabase.from("action_proposals").update({
      status: "proposed",
      updated_at: new Date().toISOString(),
    }).eq("id", proposalId).eq("status", "validated");
    return { success: false, label: "", error: msg };
  }
}

// =============================================================================
// BACKGROUND PROCESSING TASKS
// =============================================================================

async function processMessageInBackground(
  updateId: number,
  chatId: number,
  userId: number,
  userName: string,
  text: string
): Promise<void> {
  const startTime = Date.now();
  const typing = startTypingLoop(chatId);
  
  try {
    const aiResponse = await callAIAgent(text, userId, userName, chatId);
    
    typing.stop();
    
    // Send response with inline buttons
    const buttons = getQuickActionButtons(aiResponse);
    await sendTelegramMessage(chatId, aiResponse, "Markdown", buttons);
    
    // Check for new action proposals and send inline validation buttons
    await checkAndSendProposalButtons(chatId);
    
    await markUpdateAsCompleted(updateId, aiResponse);
    
    // Track stats
    const processingTime = Date.now() - startTime;
    await trackTelegramStat(chatId, userName, "text", null, processingTime, "success");
    
    if (Math.random() < 0.01) {
      cleanupOldUpdates().catch(err => console.error("Cleanup error:", err));
    }
    
  } catch (error) {
    typing.stop();
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Background processing error:", msg);
    
    await sendTelegramMessage(chatId, "❌ Je n'ai pas pu traiter votre demande. Réessayez.");
    await markUpdateAsFailed(updateId, msg);
    await trackTelegramStat(chatId, userName, "text", null, Date.now() - startTime, "failed", msg);
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
  const startTime = Date.now();
  const typing = startTypingLoop(chatId);
  
  try {
    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      typing.stop();
      await sendTelegramMessage(
        chatId, 
        `❌ Fichier trop volumineux (${(fileSize / 1024 / 1024).toFixed(1)} MB). Maximum: 20 MB.`
      );
      await markUpdateAsFailed(updateId, "File too large");
      await trackTelegramStat(chatId, userName, "audio", null, null, "failed", "File too large");
      return;
    }
    
    // Find linked entities from caption
    let linkedLeadId: string | undefined;
    let linkedProjectId: string | undefined;
    let linkedLeadName: string | undefined;
    let linkedProjectName: string | undefined;
    
    if (caption) {
      const entities = await findEntityFromCaption(caption);
      linkedLeadId = entities.leadId;
      linkedProjectId = entities.projectId;
      linkedLeadName = entities.leadName;
      linkedProjectName = entities.projectName;
    }
    
    const fileUrl = await getTelegramFileUrl(fileId);
    if (!fileUrl) {
      typing.stop();
      await sendTelegramMessage(chatId, "❌ Impossible de récupérer le fichier audio.");
      await markUpdateAsFailed(updateId, "Failed to get file URL");
      await trackTelegramStat(chatId, userName, "audio", null, null, "failed", "Failed to get file URL");
      return;
    }
    
    const fileBuffer = await downloadTelegramFile(fileUrl);
    if (!fileBuffer) {
      typing.stop();
      await sendTelegramMessage(
        chatId, 
        "❌ Impossible de télécharger le fichier audio. Vérifiez que le fichier fait moins de 20 MB."
      );
      await markUpdateAsFailed(updateId, "Failed to download file");
      await trackTelegramStat(chatId, userName, "audio", null, null, "failed", "Download failed");
      return;
    }
    
    const storagePath = await uploadToSupabaseStorage(fileBuffer, fileName, mimeType);
    if (!storagePath) {
      typing.stop();
      await sendTelegramMessage(chatId, "❌ Impossible de sauvegarder le fichier audio.");
      await markUpdateAsFailed(updateId, "Failed to upload to storage");
      await trackTelegramStat(chatId, userName, "audio", null, null, "failed", "Upload failed");
      return;
    }
    
    const result = await createTranscriptionJob(
      storagePath, "upload", userId, userName, caption,
      linkedLeadId, linkedProjectId
    );
    
    typing.stop();
    
    if (result.success) {
      let successMsg = `✅ Fichier audio reçu et enregistré !\n\n📝 Transcription créée (ID: \`${result.transcriptionId?.slice(0, 8)}...\`)`;
      
      if (linkedLeadName) {
        successMsg += `\n🔗 Lié au lead: *${linkedLeadName}*`;
      }
      if (linkedProjectName) {
        successMsg += `\n📁 Lié au projet: *${linkedProjectName}*`;
      }
      if (caption && !linkedLeadName && !linkedProjectName) {
        successMsg += `\n📌 Contexte: "${caption.slice(0, 50)}${caption.length > 50 ? '...' : ''}"`;
      }
      
      successMsg += `\n\n➡️ Accédez au Cockpit pour voir la transcription et lancer l'analyse.`;
      
      const buttons = getQuickActionButtons("transcription audio");
      await sendTelegramMessage(chatId, successMsg, "Markdown", buttons);
      await markUpdateAsCompleted(updateId, `Transcription created: ${result.transcriptionId}`);
      await trackTelegramStat(chatId, userName, "audio", null, Date.now() - startTime, "success");
    } else {
      await sendTelegramMessage(chatId, `❌ Erreur lors de la création de la transcription: ${result.error}`);
      await markUpdateAsFailed(updateId, result.error);
      await trackTelegramStat(chatId, userName, "audio", null, null, "failed", result.error);
    }
    
  } catch (error) {
    typing.stop();
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Audio processing error:", msg);
    
    await sendTelegramMessage(chatId, "❌ Erreur lors du traitement de l'audio.");
    await markUpdateAsFailed(updateId, msg);
    await trackTelegramStat(chatId, userName, "audio", null, null, "failed", msg);
  }
}

async function processDocumentInBackground(
  updateId: number,
  chatId: number,
  userId: number,
  userName: string,
  fileId: string,
  fileName: string,
  mimeType: string,
  fileType: string,
  caption?: string,
  fileSize?: number
): Promise<void> {
  const startTime = Date.now();
  const typing = startTypingLoop(chatId);
  
  try {
    if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
      typing.stop();
      await sendTelegramMessage(
        chatId, 
        `❌ Fichier trop volumineux (${(fileSize / 1024 / 1024).toFixed(1)} MB). Maximum: 20 MB.`
      );
      await markUpdateAsFailed(updateId, "File too large");
      await trackTelegramStat(chatId, userName, "document", null, null, "failed", "File too large");
      return;
    }
    
    // Find linked entities from caption
    let linkedLeadId: string | undefined;
    let linkedProjectId: string | undefined;
    let linkedLeadName: string | undefined;
    let linkedProjectName: string | undefined;
    
    if (caption) {
      const entities = await findEntityFromCaption(caption);
      linkedLeadId = entities.leadId;
      linkedProjectId = entities.projectId;
      linkedLeadName = entities.leadName;
      linkedProjectName = entities.projectName;
    }
    
    const fileUrl = await getTelegramFileUrl(fileId);
    if (!fileUrl) {
      typing.stop();
      await sendTelegramMessage(chatId, "❌ Impossible de récupérer le fichier.");
      await markUpdateAsFailed(updateId, "Failed to get file URL");
      await trackTelegramStat(chatId, userName, "document", null, null, "failed", "Failed to get file URL");
      return;
    }
    
    const fileBuffer = await downloadTelegramFile(fileUrl);
    if (!fileBuffer) {
      typing.stop();
      await sendTelegramMessage(chatId, "❌ Impossible de télécharger le fichier.");
      await markUpdateAsFailed(updateId, "Failed to download file");
      await trackTelegramStat(chatId, userName, "document", null, null, "failed", "Download failed");
      return;
    }
    
    const folder = fileType === "image" ? "telegram-images" : "telegram-documents";
    const storagePath = await uploadToSupabaseStorage(fileBuffer, fileName, mimeType, folder);
    if (!storagePath) {
      typing.stop();
      await sendTelegramMessage(chatId, "❌ Impossible de sauvegarder le fichier.");
      await markUpdateAsFailed(updateId, "Failed to upload to storage");
      await trackTelegramStat(chatId, userName, "document", null, null, "failed", "Upload failed");
      return;
    }
    
    const result = await createUploadedFile(
      storagePath, fileName, fileType, mimeType, fileBuffer.byteLength,
      userId, userName, caption, linkedLeadId, linkedProjectId
    );
    
    typing.stop();
    
    if (result.success) {
      const emoji = fileType === "image" ? "🖼️" : "📄";
      let successMsg = `✅ ${emoji} Fichier reçu et enregistré !\n\nID: \`${result.fileId?.slice(0, 8)}...\``;
      
      if (linkedLeadName) {
        successMsg += `\n🔗 Lié au lead: *${linkedLeadName}*`;
      }
      if (linkedProjectName) {
        successMsg += `\n📁 Lié au projet: *${linkedProjectName}*`;
      }
      
      successMsg += `\n\n➡️ Accédez au Cockpit pour voir le fichier.`;
      
      await sendTelegramMessage(chatId, successMsg);
      await markUpdateAsCompleted(updateId, `File uploaded: ${result.fileId}`);
      await trackTelegramStat(chatId, userName, fileType === "image" ? "image" : "document", null, Date.now() - startTime, "success");
    } else {
      await sendTelegramMessage(chatId, `❌ Erreur lors de l'import: ${result.error}`);
      await markUpdateAsFailed(updateId, result.error);
      await trackTelegramStat(chatId, userName, "document", null, null, "failed", result.error);
    }
    
  } catch (error) {
    typing.stop();
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Document processing error:", msg);
    
    await sendTelegramMessage(chatId, "❌ Erreur lors du traitement du fichier.");
    await markUpdateAsFailed(updateId, msg);
    await trackTelegramStat(chatId, userName, "document", null, null, "failed", msg);
  }
}

// =============================================================================
// CALLBACK QUERY HANDLER - Inline button clicks
// =============================================================================

async function handleCallbackQuery(
  callbackQueryId: string,
  chatId: number,
  userId: number,
  userName: string,
  data: string,
  messageId?: number
): Promise<void> {
  const parts = data.split(":");
  const actionType = parts[0];
  const actionValue = parts[1];
  const actionParam = parts.slice(2).join(":"); // proposal ID may contain colons
  
  if (actionType !== "action") {
    await answerCallbackQuery(callbackQueryId, "❌ Action non reconnue.");
    return;
  }

  // ========= ACTION PROPOSAL: VALIDATE =========
  if (actionValue === "validate" && actionParam) {
    await answerCallbackQuery(callbackQueryId, "⏳ Exécution en cours...");
    
    const result = await executeProposalFromTelegram(actionParam);
    
    if (result.error === "already_handled") {
      await answerCallbackQuery(callbackQueryId, "⚠️ Déjà traitée");
      if (messageId) await editTelegramMessage(chatId, messageId, `⚠️ Cette action a déjà été traitée.`);
      return;
    }
    if (result.error === "expired") {
      if (messageId) await editTelegramMessage(chatId, messageId, `⏰ Action expirée (>24h) : ${result.label}`);
      return;
    }
    if (result.success) {
      if (messageId) await editTelegramMessage(chatId, messageId, `✅ *Exécuté* : ${result.label}`);
      await trackTelegramStat(chatId, userName, "action_proposal", "validate", null, "success");
    } else {
      await sendTelegramMessage(chatId, `❌ Erreur d'exécution : ${result.error}`);
      await trackTelegramStat(chatId, userName, "action_proposal", "validate", null, "failed", result.error);
    }
    return;
  }

  // ========= ACTION PROPOSAL: REJECT =========
  if (actionValue === "reject" && actionParam) {
    await answerCallbackQuery(callbackQueryId, "❌ Action rejetée");
    
    // Atomic reject: only update if still in 'proposed' status
    const { data: updated, error: rejectError } = await supabase
      .from("action_proposals")
      .update({
        status: "rejected",
        validation_notes: "Rejeté via Telegram",
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionParam)
      .eq("status", "proposed")
      .select("action_label")
      .maybeSingle();

    if (rejectError || !updated) {
      if (messageId) await editTelegramMessage(chatId, messageId, `⚠️ Cette action a déjà été traitée.`);
      return;
    }

    if (messageId) await editTelegramMessage(chatId, messageId, `❌ *Rejeté* : ${updated.action_label}`);
    await trackTelegramStat(chatId, userName, "action_proposal", "reject", null, "success");
    return;
  }

  // ========= EXISTING QUICK ACTIONS =========
  await answerCallbackQuery(callbackQueryId, "⏳ Traitement...");
  
  const startTime = Date.now();
  const typing = startTypingLoop(chatId);
  
  try {
    let prompt: string;
    
    switch (actionValue) {
      case "leads":
        prompt = "Liste les 5 derniers leads avec leur statut";
        break;
      case "projects":
        prompt = "Liste les projets actifs avec leur statut";
        break;
      case "rdv":
        prompt = "Quels sont les prochains rendez-vous cette semaine ?";
        break;
      case "stats":
        prompt = "Donne-moi un résumé rapide des statistiques : nombre de leads, opportunités, projets";
        break;
      case "create_task":
        typing.stop();
        await sendTelegramMessage(chatId, "📝 Pour créer une tâche, dites-moi :\n\n_Crée une tâche [description] pour [date/heure]_\n\nExemple : \"Crée une tâche appeler Jean pour demain 14h\"");
        return;
      case "notes":
        prompt = "Résume les notes de réunion récentes";
        break;
      case "call":
        typing.stop();
        await sendTelegramMessage(chatId, "📞 Pour planifier un appel, utilisez /rappel :\n\n`/rappel 14h Appeler [nom]`");
        return;
      case "help":
        typing.stop();
        await sendTelegramMessage(chatId, formatHelpMessage());
        return;
      default:
        typing.stop();
        await sendTelegramMessage(chatId, "❌ Action non reconnue.");
        return;
    }
    
    const aiResponse = await callAIAgent(prompt, userId, userName, chatId);
    typing.stop();
    
    const buttons = getQuickActionButtons(aiResponse);
    await sendTelegramMessage(chatId, aiResponse, "Markdown", buttons);
    
    await trackTelegramStat(chatId, userName, "command", actionValue, Date.now() - startTime, "success");
    
  } catch (error) {
    typing.stop();
    const msg = error instanceof Error ? error.message : String(error);
    await sendTelegramMessage(chatId, "❌ Erreur lors du traitement.");
    await trackTelegramStat(chatId, userName, "command", actionValue, null, "failed", msg);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Handle callback queries (inline button clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message?.chat.id;
      const userId = cb.from.id;
      const userName = cb.from.first_name + (cb.from.last_name ? ` ${cb.from.last_name}` : "");
      
      if (chatId && cb.data) {
        handleCallbackQuery(cb.id, chatId, userId, userName, cb.data, cb.message?.message_id)
          .catch(err => console.error("Callback query error:", err));
      } else {
        await answerCallbackQuery(cb.id, "❌ Erreur");
      }
      
      return new Response("OK", { status: 200 });
    }

    const message = update.message;
    if (!message) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const userName = message.from.first_name + (message.from.last_name ? ` ${message.from.last_name}` : "");
    const updateId = update.update_id;

    // Deduplication check
    const alreadyProcessed = await isUpdateAlreadyProcessed(updateId);
    if (alreadyProcessed) {
      console.log(`Update ${updateId} already processed, ignoring duplicate`);
      return new Response("OK", { status: 200 });
    }

    const claimed = await markUpdateAsProcessing(updateId, chatId);
    if (!claimed) {
      console.log(`Update ${updateId} claimed by another instance, ignoring`);
      return new Response("OK", { status: 200 });
    }

    // Security check - Enforce user whitelist
    if (REQUIRE_USER_WHITELIST && ALLOWED_USERS.length === 0) {
      console.error("Security: No allowed users configured in TELEGRAM_ADMIN_CHAT_ID");
      await sendTelegramMessage(chatId, "⛔ Bot non configuré. Veuillez définir TELEGRAM_ADMIN_CHAT_ID.");
      await markUpdateAsCompleted(updateId, "No allowed users configured");
      return new Response("OK", { status: 200 });
    }

    if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
      console.log(`Security: Unauthorized user ${userId} (${userName}) attempted access`);
      await sendTelegramMessage(chatId, "⛔ Accès non autorisé. Contactez l'administrateur.");
      await markUpdateAsCompleted(updateId, "Unauthorized user");
      return new Response("OK", { status: 200 });
    }

    // =========================================================================
    // HANDLE PHOTOS
    // =========================================================================
    
    if (message.photo && message.photo.length > 0) {
      await sendTelegramMessage(chatId, "🖼️ Image reçue. Import en cours...");
      
      // Get the largest photo
      const largestPhoto = message.photo[message.photo.length - 1];
      const fileName = `image_${Date.now()}.jpg`;
      
      processDocumentInBackground(
        updateId, chatId, userId, userName,
        largestPhoto.file_id, fileName, "image/jpeg", "image",
        message.caption, largestPhoto.file_size
      ).catch(err => console.error("Background image processing error:", err));
      
      return new Response("OK", { status: 200 });
    }

    // =========================================================================
    // HANDLE AUDIO/VOICE MESSAGES
    // =========================================================================
    
    if (message.voice) {
      await sendTelegramMessage(chatId, "🎤 Message vocal reçu. Import en cours...");
      
      const fileName = `voice_${Date.now()}.ogg`;
      const mimeType = message.voice.mime_type || "audio/ogg";
      
      processAudioInBackground(
        updateId, chatId, userId, userName, 
        message.voice.file_id, fileName, mimeType,
        message.caption, message.voice.file_size
      ).catch(err => console.error("Background audio processing error:", err));
      
      return new Response("OK", { status: 200 });
    }
    
    if (message.audio) {
      await sendTelegramMessage(chatId, "🎵 Fichier audio reçu. Import en cours...");
      
      const fileName = message.audio.title || `audio_${Date.now()}.mp3`;
      const mimeType = message.audio.mime_type || "audio/mpeg";
      
      processAudioInBackground(
        updateId, chatId, userId, userName,
        message.audio.file_id, fileName, mimeType,
        message.caption, message.audio.file_size
      ).catch(err => console.error("Background audio processing error:", err));
      
      return new Response("OK", { status: 200 });
    }
    
    // =========================================================================
    // HANDLE DOCUMENTS
    // =========================================================================
    
    if (message.document) {
      const mimeType = message.document.mime_type || "application/octet-stream";
      const fileName = message.document.file_name || `document_${Date.now()}`;
      
      // Check if it's an audio file
      if (mimeType.startsWith("audio/")) {
        await sendTelegramMessage(chatId, "📎 Document audio reçu. Import en cours...");
        
        processAudioInBackground(
          updateId, chatId, userId, userName,
          message.document.file_id, fileName, mimeType,
          message.caption, message.document.file_size
        ).catch(err => console.error("Background audio processing error:", err));
        
        return new Response("OK", { status: 200 });
      }
      
      // Check if it's a PDF or image
      const isImage = mimeType.startsWith("image/");
      const isPdf = mimeType === "application/pdf";
      const isDoc = mimeType.includes("word") || mimeType.includes("document");
      
      if (isImage || isPdf || isDoc) {
        const emoji = isImage ? "🖼️" : "📄";
        await sendTelegramMessage(chatId, `${emoji} Document reçu. Import en cours...`);
        
        const fileType = isImage ? "image" : "document";
        
        processDocumentInBackground(
          updateId, chatId, userId, userName,
          message.document.file_id, fileName, mimeType, fileType,
          message.caption, message.document.file_size
        ).catch(err => console.error("Background document processing error:", err));
        
        return new Response("OK", { status: 200 });
      }
      
      // Unsupported file type
      await sendTelegramMessage(chatId, `⚠️ Type de fichier non supporté: ${mimeType}\n\nTypes supportés: images, PDF, documents Word, fichiers audio.`);
      await markUpdateAsCompleted(updateId, "Unsupported file type");
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

    // Handle commands
    if (text.startsWith("/")) {
      const command = text.split(" ")[0].toLowerCase();
      
      switch (command) {
        case "/start":
          await sendTelegramMessage(chatId, `Bonjour ${userName} ! 👋\n\n${formatHelpMessage()}`);
          await markUpdateAsCompleted(updateId, "/start command");
          await trackTelegramStat(chatId, userName, "command", "start", null, "success");
          return new Response("OK", { status: 200 });
          
        case "/help":
          await sendTelegramMessage(chatId, formatHelpMessage());
          await markUpdateAsCompleted(updateId, "/help command");
          await trackTelegramStat(chatId, userName, "command", "help", null, "success");
          return new Response("OK", { status: 200 });
          
        case "/rappel": {
          const parsed = parseReminderCommand(text);
          if (!parsed) {
            await sendTelegramMessage(chatId, "❌ Format invalide.\n\nExemples :\n• `/rappel 14h Appeler Jean`\n• `/rappel demain 10h Envoyer devis`\n• `/rappel 30m Vérifier email`");
            await markUpdateAsCompleted(updateId, "/rappel - invalid format");
            return new Response("OK", { status: 200 });
          }
          
          const result = await createReminder(chatId, userId, userName, parsed.text, parsed.remindAt);
          
          if (result.success) {
            const timeStr = parsed.remindAt.toLocaleString("fr-FR", { 
              weekday: "short", day: "numeric", month: "short", 
              hour: "2-digit", minute: "2-digit" 
            });
            await sendTelegramMessage(chatId, `✅ Rappel créé !\n\n📝 ${parsed.text}\n⏰ ${timeStr}`);
            await trackTelegramStat(chatId, userName, "command", "rappel", null, "success");
          } else {
            await sendTelegramMessage(chatId, `❌ Erreur: ${result.error}`);
            await trackTelegramStat(chatId, userName, "command", "rappel", null, "failed", result.error);
          }
          
          await markUpdateAsCompleted(updateId, "/rappel command");
          return new Response("OK", { status: 200 });
        }
          
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
          break;
      }
    }

    // Regular message - Process with AI
    await sendTelegramMessage(chatId, "⏳ Reçu. Je traite votre demande…");

    processMessageInBackground(updateId, chatId, userId, userName, text)
      .catch(err => console.error("Background processing error:", err));

    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
