import { cn } from "@/lib/utils";

interface AgentChatPreviewProps {
  className?: string;
}

/**
 * AgentChatPreview — démo visuelle d'agent RAG IArche (Lot D2).
 * Tokens sémantiques uniquement, zéro emoji.
 */
export function AgentChatPreview({ className }: AgentChatPreviewProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-3xl motion-safe:animate-fadeIn",
        className,
      )}
    >

      {/* Glow halo */}
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-accent/15 via-transparent to-primary/15 blur-3xl"
      />

      <div className="relative rounded-2xl border border-border-subtle bg-background shadow-soft-lg overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-secondary/50">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/30" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/30" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-subtle">
            Cockpit IArche · Agent RAG
          </span>
          <span className="text-[10px] font-medium text-text-subtle/70">v2.0</span>
        </div>

        {/* Conversation */}
        <div className="p-6 md:p-8 space-y-5">
          {/* User message */}
          <div className="max-w-[85%]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-subtle mb-1.5">
              Vous
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm text-foreground leading-relaxed">
              Comment optimiser la gestion RH de nos 45 collaborateurs terrain ?
            </div>
          </div>

          {/* Agent message */}
          <div className="ml-auto max-w-[88%]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent mb-1.5 text-right">
              Agent IArche
            </div>
            <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 shadow-soft-md">
              <p className="text-sm leading-relaxed">
                D&apos;après vos 45 dossiers collaborateurs indexés, j&apos;ai
                identifié 3 goulots dans la validation des heures. Voici le
                protocole d&apos;automatisation recommandé.
              </p>
              <div className="mt-3 pt-3 border-t border-primary-foreground/10 flex flex-wrap gap-1.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary-foreground/10 text-primary-foreground/80">
                  Dossiers_RH_2026.pdf
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary-foreground/10 text-primary-foreground/80">
                  Planning_terrain.csv
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary-foreground/10 text-primary-foreground/80">
                  Convention_BTP.docx
                </span>
              </div>
            </div>
          </div>

          {/* Input mock */}
          <div className="pt-2">
            <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-secondary/40 px-4 py-3">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-accent motion-safe:animate-pulse"
              />
              <span className="text-sm text-text-subtle flex-1">
                Interroger votre base documentaire…
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-subtle">
                RAG actif
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentChatPreview;
