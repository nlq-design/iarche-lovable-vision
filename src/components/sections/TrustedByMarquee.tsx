import { cn } from "@/lib/utils";

interface TrustedByMarqueeProps {
  className?: string;
}

const LABELS = [
  "Distribution Industrielle",
  "Cabinet de Conseil",
  "Bureau d'études BTP",
  "Syndic & Immobilier",
  "Industrie Aérospatiale",
  "PME Services B2B",
];

/**
 * TrustedByMarquee — bandeau preuve sociale Night Blue, défilement infini.
 * Pause au hover, respecte prefers-reduced-motion.
 */
export function TrustedByMarquee({ className }: TrustedByMarqueeProps) {
  const doubled = [...LABELS, ...LABELS];

  return (
    <section
      className={cn(
        "relative bg-primary text-primary-foreground py-10 overflow-hidden",
        className,
      )}
      aria-label="Secteurs accompagnés par IArche"
    >
      <div className="container mx-auto px-6 mb-6 flex items-center justify-center gap-3">
        <span className="h-px w-8 bg-primary-foreground/20" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary-foreground/60">
          Ils nous font confiance — PME & ETI françaises
        </span>
        <span className="h-px w-8 bg-primary-foreground/20" aria-hidden />
      </div>

      <div
        className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <div
          className="flex w-max items-center gap-16 motion-safe:animate-[trusted-marquee_42s_linear_infinite] group-hover:[animation-play-state:paused]"
        >
          {doubled.map((label, i) => (
            <span
              key={`${label}-${i}`}
              aria-hidden={i >= LABELS.length}
              className="shrink-0 text-lg md:text-xl font-extrabold tracking-[0.08em] uppercase text-primary-foreground/40 hover:text-primary-foreground/80 transition-colors"
            >
              {label}
            </span>
          ))}
        </div>
        <style>{`
          @keyframes trusted-marquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </section>
  );
}

export default TrustedByMarquee;
