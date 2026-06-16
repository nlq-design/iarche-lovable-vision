import { useId } from "react";
import { cn } from "@/lib/utils";

interface AnimatedArcProps {
  center?: boolean;
  /** Durée du déplacement du point lumineux (s). */
  dur?: number;
  className?: string;
}

/**
 * Arc lumineux animé — signature IArche v4.0.
 * Parabole dégradée terracotta→navy + point lumineux qui glisse en boucle.
 * Respecte prefers-reduced-motion (l'animation s'arrête, l'arc reste).
 */
export default function AnimatedArc({ center, dur = 3, className }: AnimatedArcProps) {
  const raw = useId().replace(/[:]/g, "");
  const grad = `arc-grad-${raw}`;
  const path = `arc-path-${raw}`;
  const dot = `arc-dot-${raw}`;

  return (
    <svg
      className={cn("ds-arc", center && "ds-arc--center", className)}
      viewBox="0 0 210 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="210" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C8431D" />
          <stop offset="0.55" stopColor="#D54B3A" />
          <stop offset="1" stopColor="#1A2B4A" />
        </linearGradient>
        <path id={path} d="M 6 26 Q 105 -4 204 26" />
        <radialGradient id={dot} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.3" stopColor="#F7E2D6" />
          <stop offset="0.6" stopColor="#C8431D" stopOpacity="0.7" />
          <stop offset="1" stopColor="#C8431D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <use href={`#${path}`} stroke={`url(#${grad})`} strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle r="7" fill={`url(#${dot})`} opacity="0.95" className="motion-reduce:hidden">
        <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto">
          <mpath href={`#${path}`} />
        </animateMotion>
      </circle>
      <circle r="2.6" fill="#FFFFFF" className="motion-reduce:hidden">
        <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto">
          <mpath href={`#${path}`} />
        </animateMotion>
      </circle>
    </svg>
  );
}
