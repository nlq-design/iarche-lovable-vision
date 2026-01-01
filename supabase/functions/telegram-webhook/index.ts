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
  date: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

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
  } catch (error) {
    console.error("Error sending Telegram message:", error);
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

async function callAIAgent(message: string, userId: number, userName: string): Promise<string> {
  console.log("Calling AI agent with message:", message);

  try {
    // Format messages array as expected by the orchestrator
    const messagesPayload = [
      { role: "user", content: message }
    ];

    // Call the AI agent orchestrator
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
      }),
    });

    console.log("AI Agent response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Agent error:", response.status, errorText);
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error calling AI agent:", errorMessage);
    return `❌ Erreur: ${errorMessage}`;
  }
}

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

*Exemples de questions :*
• "Quels sont les leads de cette semaine ?"
• "Crée une tâche pour rappeler Jean demain"
• "Résume le projet Dupont"
• "Quel est le pipeline commercial ?"

Posez simplement votre question et je vous répondrai !`;
}

serve(async (req) => {
  // Handle CORS preflight requests (useful for debugging from a browser)
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Debug / health endpoint
  // - GET /telegram-webhook                 -> simple text health
  // - GET /telegram-webhook?debug=1         -> bot + webhook status (no secrets)
  // - GET /telegram-webhook?setup=1         -> set webhook to THIS endpoint (safe, no custom URL)
  // - GET /telegram-webhook?setup=1&debug=1 -> set + return status
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
    console.log("Received Telegram update:", JSON.stringify(update, null, 2));

    const message = update.message;
    if (!message || !message.text) {
      return new Response("OK", { status: 200 });
    }

    const chatId = message.chat.id;
    const userId = message.from.id;
    const userName = message.from.first_name + (message.from.last_name ? ` ${message.from.last_name}` : "");
    const text = message.text.trim();

    // Security check: only allow specific users if configured
    if (ALLOWED_USERS.length > 0 && !ALLOWED_USERS.includes(userId)) {
      await sendTelegramMessage(chatId, "⛔ Accès non autorisé. Contactez l'administrateur.");
      return new Response("OK", { status: 200 });
    }

    // Handle commands
    if (text.startsWith("/")) {
      const command = text.split(" ")[0].toLowerCase();
      
      switch (command) {
        case "/start":
          await sendTelegramMessage(chatId, `Bonjour ${userName} ! 👋\n\n${formatHelpMessage()}`);
          return new Response("OK", { status: 200 });
          
        case "/help":
          await sendTelegramMessage(chatId, formatHelpMessage());
          return new Response("OK", { status: 200 });
          
        case "/leads":
          await sendTypingAction(chatId);
          const leadsResponse = await callAIAgent("Liste les 5 derniers leads avec leur statut", userId, userName);
          await sendTelegramMessage(chatId, leadsResponse);
          return new Response("OK", { status: 200 });
          
        case "/rdv":
          await sendTypingAction(chatId);
          const rdvResponse = await callAIAgent("Liste les 5 prochains RDV avec date, heure, nom, type et statut", userId, userName);
          await sendTelegramMessage(chatId, rdvResponse);
          return new Response("OK", { status: 200 });
          
        case "/projets":
          await sendTypingAction(chatId);
          const projetsResponse = await callAIAgent("Liste les projets actifs avec leur statut", userId, userName);
          await sendTelegramMessage(chatId, projetsResponse);
          return new Response("OK", { status: 200 });
          
        case "/stats":
          await sendTypingAction(chatId);
          const statsResponse = await callAIAgent("Donne-moi un résumé rapide des statistiques : nombre de leads, opportunités, projets", userId, userName);
          await sendTelegramMessage(chatId, statsResponse);
          return new Response("OK", { status: 200 });
          
        default:
          // Unknown command, treat as regular message
          break;
      }
    }

    // Send typing indicator
    await sendTypingAction(chatId);

    // Quick immediate acknowledgment (helps confirm Telegram sendMessage works)
    await sendTelegramMessage(chatId, "⏳ Reçu. Je traite votre demande…", "Markdown");

    // Process with AI agent
    const aiResponse = await callAIAgent(text, userId, userName);
    await sendTelegramMessage(chatId, aiResponse);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
