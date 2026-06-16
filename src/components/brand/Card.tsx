import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Numéro mono (ex "01") affiché en haut de carte. */
  num?: string;
}

/** Carte claire (sable, liseré terracotta au survol) — sur sections claires. */
export function SolidCard({ num, className, children, ...rest }: CardProps) {
  return (
    <div className={cn("ds-card ds-card-solid", className)} {...rest}>
      {num && <div className="ds-card-num">{num}</div>}
      {children}
    </div>
  );
}

/** Carte verre dépoli — sur sections sombres. */
export function GlassCard({ num, className, children, ...rest }: CardProps) {
  return (
    <div className={cn("ds-card ds-card-glass", className)} {...rest}>
      {num && <div className="ds-card-num">{num}</div>}
      {children}
    </div>
  );
}
