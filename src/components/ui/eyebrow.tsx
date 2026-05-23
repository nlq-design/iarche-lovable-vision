import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "accent" | "primary" | "muted";
}

/**
 * Eyebrow — label de section (Lot D1).
 * Typographie tracking aéré, uppercase, petite taille.
 */
export function Eyebrow({ className, tone = "accent", children, ...rest }: EyebrowProps) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "primary"
        ? "text-primary"
        : "text-muted-foreground";
  return (
    <span
      className={cn(
        "text-eyebrow inline-flex items-center gap-2 before:h-px before:w-6 before:bg-current before:opacity-60",
        toneClass,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
