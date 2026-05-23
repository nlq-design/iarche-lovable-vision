import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const HIDDEN_PREFIXES = [
  "/admin",
  "/cockpit",
  "/partner",
  "/espace-partenaire",
  "/viviers",
  "/onboarding",
  "/auth",
  "/login",
  "/signup",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-rag-chat`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Bonjour, je suis Nicolas — assistant RAG d'IArche. Posez-moi vos questions sur l'IA appliquée à votre métier, nos solutions, ou demandez un échange.",
};

export function ChatbotRagWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  if (hidden) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last !== WELCOME) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const history = [...messages, userMsg].filter((m) => m !== WELCOME);
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({}));
        setMessages((p) => [
          ...p,
          { role: "assistant", content: errBody.error || "Désolé, une erreur est survenue. Réessayez dans un instant." },
        ]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((p) => [...p, { role: "assistant", content: "Connexion interrompue. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        aria-label={open ? "Fermer le chatbot" : "Ouvrir le chatbot RAG IArche"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-[60] group",
          "flex items-center gap-2 rounded-full",
          "bg-[hsl(var(--night-blue))] text-white",
          "px-5 py-3.5 shadow-[0_10px_40px_-10px_rgba(26,43,74,0.55)]",
          "border border-white/10",
          "transition-all duration-300 ease-out",
          "hover:shadow-[0_18px_50px_-10px_rgba(176,74,50,0.45)] hover:-translate-y-0.5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--terracotta))] focus-visible:ring-offset-2",
          open && "scale-90 opacity-0 pointer-events-none"
        )}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--terracotta))] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--terracotta))]" />
        </span>
        <span className="text-sm font-medium tracking-tight">Chatbot RAG by IArche</span>
        <MessageSquare className="h-4 w-4 opacity-80" strokeWidth={1.75} />
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-[60] w-[calc(100vw-3rem)] sm:w-[400px]",
          "max-h-[min(640px,calc(100vh-3rem))]",
          "flex flex-col rounded-2xl overflow-hidden",
          "bg-[hsl(var(--night-blue))] text-white",
          "shadow-[0_30px_80px_-20px_rgba(26,43,74,0.65)]",
          "border border-white/10",
          "transition-all duration-300 ease-out origin-bottom-right",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none translate-y-2"
        )}
        role="dialog"
        aria-label="Chatbot RAG IArche"
      >
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-white/10 bg-gradient-to-br from-[hsl(var(--night-blue))] to-[hsl(220_45%_12%)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[hsl(var(--terracotta))] to-[hsl(15_55%_30%)] flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[hsl(var(--night-blue))]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight truncate">Nicolas — RAG IArche</div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-white/55">En ligne · Bayonne</div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3 scroll-smooth">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-[hsl(var(--terracotta))] text-white rounded-br-md shadow-sm"
                    : "bg-white/[0.06] text-white/95 rounded-bl-md border border-white/5"
                )}
              >
                {m.content}
                {m.role === "assistant" && loading && i === messages.length - 1 && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 -mb-0.5 bg-white/70 animate-pulse" />
                )}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-white/[0.06] border border-white/5 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 bg-[hsl(220_45%_10%)] px-3 py-3">
          <div className="flex items-end gap-2 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 focus-within:border-[hsl(var(--terracotta))] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Posez votre question…"
              disabled={loading}
              className="flex-1 bg-transparent text-[13.5px] text-white placeholder:text-white/40 resize-none outline-none max-h-32 leading-relaxed py-1"
              style={{ minHeight: "24px" }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Envoyer"
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                input.trim() && !loading
                  ? "bg-[hsl(var(--terracotta))] text-white hover:brightness-110"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              )}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={2.25} />}
            </button>
          </div>
          <div className="mt-2 text-center text-[10.5px] text-white/35 tracking-wide">
            Propulsé par la plateforme RAG IArche · Bayonne
          </div>
        </div>
      </div>
    </>
  );
}
