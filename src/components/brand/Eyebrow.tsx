import { cn } from "@/lib/utils";

interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  center?: boolean;
}

/** Kicker mono ✦ (charte v4.0). Terracotta sur clair, soft sur sombre (auto via .sec-dark). */
export default function Eyebrow({ center, className, children, ...rest }: EyebrowProps) {
  return (
    <span className={cn("ds-eyebrow", center && "ds-eyebrow--center", className)} {...rest}>
      {children}
    </span>
  );
}

/** Variante hero : pilule bordée sur fond sombre. */
export function HeroEyebrow({ className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ds-hero-eyebrow", className)} {...rest}>
      <span className="star" aria-hidden="true">✦</span>
      {children}
    </span>
  );
}
