import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GradientMeshProps {
  className?: string;
  /** Active la parallaxe souris (desktop uniquement). */
  interactive?: boolean;
  intensity?: "subtle" | "medium" | "strong";
}

/**
 * GradientMesh — fond mesh animé (Night Blue + Terracotta glow) pour Hero (Lot D2).
 * Sans dépendance, pur CSS + parallaxe souris légère.
 */
export function GradientMesh({
  className,
  interactive = true,
  intensity = "medium",
}: GradientMeshProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        el.style.setProperty("--mx", `${x * 12}px`);
        el.style.setProperty("--my", `${y * 12}px`);
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [interactive]);

  const opacity = intensity === "subtle" ? 0.55 : intensity === "strong" ? 1 : 0.8;

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      style={{ ["--mx" as string]: "0px", ["--my" as string]: "0px" }}
    >
      <div
        className="absolute inset-0 bg-gradient-mesh-hero"
        style={{
          opacity,
          transform: "translate3d(var(--mx), var(--my), 0)",
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsla(12, 60%, 50%, 0.22), transparent 70%)",
          transform: "translate3d(calc(var(--mx) * -1), calc(var(--my) * -1), 0)",
          transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        className="absolute -bottom-40 -left-32 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsla(218, 47%, 30%, 0.28), transparent 70%)",
          transform: "translate3d(calc(var(--mx) * 0.6), calc(var(--my) * 0.6), 0)",
          transition: "transform 800ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}
