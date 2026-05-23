import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MarqueeLogosProps {
  items: ReactNode[];
  speed?: "slow" | "normal" | "fast";
  className?: string;
  fade?: boolean;
}

/**
 * MarqueeLogos — défilement infini horizontal pour logos clients/partenaires (Lot D2).
 * Pause au hover. Respecte prefers-reduced-motion (figé).
 */
export function MarqueeLogos({
  items,
  speed = "normal",
  className,
  fade = true,
}: MarqueeLogosProps) {
  const duration = speed === "slow" ? "60s" : speed === "fast" ? "25s" : "40s";
  const doubled = [...items, ...items];

  return (
    <div
      className={cn(
        "group relative overflow-hidden",
        fade &&
          "[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]",
        className,
      )}
    >
      <div
        className="flex w-max items-center gap-12 motion-safe:animate-[marquee_var(--marquee-duration)_linear_infinite] group-hover:[animation-play-state:paused]"
        style={{ ["--marquee-duration" as string]: duration }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex h-12 shrink-0 items-center text-text-subtle opacity-70 transition-opacity hover:opacity-100"
            aria-hidden={i >= items.length}
          >
            {item}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
