import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useInViewReveal } from "@/hooks/useInViewReveal";

interface StatCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label?: string;
  duration?: number;
  decimals?: number;
  className?: string;
  size?: "md" | "lg" | "xl";
}

/**
 * StatCounter — chiffre animé au scroll (Lot D2).
 * Démarre l'incrément quand l'élément entre dans le viewport (once).
 */
export function StatCounter({
  value,
  suffix = "",
  prefix = "",
  label,
  duration = 1600,
  decimals = 0,
  className,
  size = "lg",
}: StatCounterProps) {
  const { ref, inView } = useInViewReveal<HTMLDivElement>({ threshold: 0.4 });
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const sizeClass =
    size === "xl" ? "text-display" : size === "lg" ? "text-h1" : "text-h3";

  const formatted = decimals
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString("fr-FR");

  return (
    <div ref={ref} className={cn("flex flex-col gap-2", className)}>
      <span className={cn("font-bold tabular-nums text-primary", sizeClass)}>
        {prefix}
        {formatted}
        {suffix}
      </span>
      {label && <span className="text-sm uppercase tracking-wider text-text-subtle">{label}</span>}
    </div>
  );
}
