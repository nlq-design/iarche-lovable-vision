import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { HTMLAttributes, ReactNode } from "react";

interface SectionShellProps extends HTMLAttributes<HTMLElement> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  tone?: "default" | "muted" | "night";
  size?: "sm" | "md" | "lg";
  container?: "default" | "wide" | "narrow" | "full";
  as?: "section" | "div" | "article";
  headerActions?: ReactNode;
}

/**
 * SectionShell — wrapper standard des sections du site public (Lot D2).
 * Gère padding, container, header (eyebrow + titre + sous-titre) et tonalité.
 */
export function SectionShell({
  eyebrow,
  title,
  subtitle,
  align = "left",
  tone = "default",
  size = "md",
  container = "default",
  as: Tag = "section",
  headerActions,
  className,
  children,
  ...rest
}: SectionShellProps) {
  const padding =
    size === "sm" ? "py-12 md:py-16" : size === "lg" ? "py-24 md:py-36" : "py-16 md:py-24";

  const toneClass =
    tone === "night"
      ? "bg-gradient-night text-primary-foreground"
      : tone === "muted"
        ? "bg-secondary text-foreground"
        : "bg-background text-foreground";

  const containerClass =
    container === "full"
      ? "w-full px-4 md:px-8"
      : container === "wide"
        ? "mx-auto w-full max-w-7xl px-4 md:px-8"
        : container === "narrow"
          ? "mx-auto w-full max-w-3xl px-4 md:px-6"
          : "mx-auto w-full max-w-6xl px-4 md:px-8";

  const alignClass = align === "center" ? "text-center items-center" : "text-left items-start";
  const hasHeader = eyebrow || title || subtitle || headerActions;

  return (
    <Tag className={cn("relative isolate", padding, toneClass, className)} {...rest}>
      <div className={containerClass}>
        {hasHeader && (
          <header
            className={cn(
              "flex flex-col gap-4 md:gap-5 mb-10 md:mb-14",
              alignClass,
              headerActions && "md:flex-row md:items-end md:justify-between",
            )}
          >
            <div className={cn("flex flex-col gap-4", alignClass)}>
              {eyebrow &&
                (typeof eyebrow === "string" ? (
                  <Eyebrow tone={tone === "night" ? "muted" : "accent"}>{eyebrow}</Eyebrow>
                ) : (
                  eyebrow
                ))}
              {title && (
                <h2
                  className={cn(
                    "text-h2 max-w-3xl text-balance",
                    tone === "night" ? "text-primary-foreground" : "text-primary",
                  )}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  className={cn(
                    "text-lead max-w-2xl",
                    tone === "night" ? "text-primary-foreground/80" : "text-text-subtle",
                  )}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {headerActions && <div className="shrink-0">{headerActions}</div>}
          </header>
        )}
        {children}
      </div>
    </Tag>
  );
}
