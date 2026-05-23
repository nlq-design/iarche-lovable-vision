import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GradientMesh } from "@/components/sections/GradientMesh";
import { NoiseOverlay } from "@/components/sections/NoiseOverlay";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  align?: "left" | "center";
  actions?: ReactNode;
  tone?: "light" | "night";
  size?: "sm" | "md" | "lg";
  showMesh?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * PageHero — Hero signature unifié pour pages intérieures (Lot D3).
 * Variantes claire (default) ou night, mesh animé optionnel, breadcrumbs SEO-friendly.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  align = "center",
  actions,
  tone = "light",
  size = "md",
  showMesh = true,
  className,
  children,
}: PageHeroProps) {
  const isNight = tone === "night";
  const padding =
    size === "sm" ? "pt-28 pb-12 md:pt-32 md:pb-16" : size === "lg" ? "pt-32 pb-24 md:pt-40 md:pb-32" : "pt-28 pb-16 md:pt-36 md:pb-24";
  const alignClass = align === "center" ? "items-center text-center mx-auto" : "items-start text-left";

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden",
        padding,
        isNight ? "bg-gradient-night text-primary-foreground" : "bg-background text-foreground",
        className,
      )}
    >
      {showMesh && (
        <>
          <GradientMesh intensity={isNight ? "strong" : "subtle"} />
          {isNight && <NoiseOverlay opacity={0.08} />}
        </>
      )}

      <div className="relative mx-auto w-full max-w-5xl px-4 md:px-8">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Fil d'Ariane"
            className={cn(
              "mb-6 flex flex-wrap items-center gap-1.5 text-sm",
              align === "center" && "justify-center",
              isNight ? "text-primary-foreground/70" : "text-text-subtle",
            )}
          >
            {breadcrumbs.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {b.href ? (
                  <Link
                    to={b.href}
                    className="transition-colors hover:text-accent"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span aria-current="page" className={isNight ? "text-primary-foreground" : "text-primary"}>
                    {b.label}
                  </span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <ChevronRight aria-hidden className="h-3.5 w-3.5 opacity-60" />
                )}
              </span>
            ))}
          </nav>
        )}

        <div className={cn("flex flex-col gap-5", alignClass)}>
          {eyebrow && (
            <Eyebrow tone={isNight ? "muted" : "accent"}>{eyebrow}</Eyebrow>
          )}
          <h1
            className={cn(
              "text-h1 max-w-3xl text-balance",
              isNight ? "text-primary-foreground" : "text-primary",
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "text-lead max-w-2xl",
                isNight ? "text-primary-foreground/80" : "text-text-subtle",
              )}
            >
              {subtitle}
            </p>
          )}
          {actions && <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div>}
          {children}
        </div>
      </div>
    </section>
  );
}
