import { cn } from "@/lib/utils";

interface NoiseOverlayProps {
  className?: string;
  opacity?: number;
}

/**
 * NoiseOverlay — texture grain SVG inline pour sections sombres premium (Lot D2).
 * Aucune image externe, accessible en pur SVG.
 */
export function NoiseOverlay({ className, opacity = 0.06 }: NoiseOverlayProps) {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  );
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 mix-blend-overlay", className)}
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        opacity,
      }}
    />
  );
}
