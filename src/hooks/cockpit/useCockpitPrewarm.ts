// Phase G — Cache Prewarming Intelligent
// Déclenche un seul prewarm par session navigateur (sessionStorage guard).
// L'edge function applique son propre throttle 6h par workspace côté serveur.
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "iarche:cockpit-prewarm-done";

export function useCockpitPrewarm(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    sessionStorage.setItem(SESSION_KEY, "1");

    // Fire-and-forget — ne bloque jamais le rendu Cockpit
    supabase.functions
      .invoke("cache-prewarm", { body: {} })
      .then(({ data, error }) => {
        if (error) {
          console.warn("[prewarm] failed:", error.message);
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }
        if (data?.skipped) {
          console.log("[prewarm] skipped:", data.reason);
        } else {
          console.log(`[prewarm] ok cache_hits=${data?.cache_hits} llm=${data?.llm_calls}`);
        }
      })
      .catch((e) => {
        console.warn("[prewarm] exception:", e);
        sessionStorage.removeItem(SESSION_KEY);
      });
  }, [enabled]);
}
