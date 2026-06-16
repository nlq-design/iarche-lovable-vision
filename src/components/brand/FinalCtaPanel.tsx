import { cn } from "@/lib/utils";

interface FinalCtaPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Items d'info séparés par des points (ex ["30 minutes", "en visio", "sans engagement"]). */
  info?: string[];
}

/** Panneau CTA final glass à halo terracotta (charte v4.0), sur section sombre. */
export default function FinalCtaPanel({ info, className, children, ...rest }: FinalCtaPanelProps) {
  return (
    <div className={cn("ds-final-glow", className)} {...rest}>
      {children}
      {info && info.length > 0 && (
        <div className="ds-final-info mt-7">
          {info.map((item, i) => (
            <span key={i} className="contents">
              {i > 0 && <span className="dot" aria-hidden="true" />}
              <span>{item}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
