import { cn } from "@/lib/utils";
import { Quote } from "lucide-react";
import type { ReactNode } from "react";

interface TestimonialCardProps {
  quote: ReactNode;
  author: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  logo?: ReactNode;
  caseStudyHref?: string;
  caseStudyLabel?: string;
  tone?: "default" | "night";
  className?: string;
}

/**
 * TestimonialCard — carte témoignage premium (Lot D2).
 * Variante claire et nuit, avec lien étude de cas optionnel.
 */
export function TestimonialCard({
  quote,
  author,
  role,
  company,
  avatarUrl,
  logo,
  caseStudyHref,
  caseStudyLabel = "Voir l'étude de cas",
  tone = "default",
  className,
}: TestimonialCardProps) {
  const isNight = tone === "night";
  return (
    <figure
      className={cn(
        "group relative flex h-full flex-col justify-between gap-8 rounded-xl border p-7 md:p-8 transition-shadow",
        isNight
          ? "border-white/10 bg-gradient-night text-primary-foreground shadow-night"
          : "border-border-subtle bg-card text-foreground shadow-soft-sm hover:shadow-soft-md",
        className,
      )}
    >
      <Quote
        aria-hidden
        className={cn(
          "h-8 w-8 shrink-0",
          isNight ? "text-accent" : "text-accent/80",
        )}
      />
      <blockquote
        className={cn(
          "text-lg leading-relaxed md:text-xl",
          isNight ? "text-primary-foreground/90" : "text-foreground/90",
        )}
      >
        {quote}
      </blockquote>
      <figcaption className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              loading="lazy"
              className="h-11 w-11 rounded-full object-cover ring-2 ring-background/40"
            />
          ) : (
            <span
              aria-hidden
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold",
                isNight ? "bg-white/10 text-primary-foreground" : "bg-secondary text-primary",
              )}
            >
              {author
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{author}</span>
            {(role || company) && (
              <span
                className={cn(
                  "text-xs",
                  isNight ? "text-primary-foreground/70" : "text-text-subtle",
                )}
              >
                {[role, company].filter(Boolean).join(" — ")}
              </span>
            )}
          </div>
        </div>
        {logo && <div className="opacity-70">{logo}</div>}
      </figcaption>
      {caseStudyHref && (
        <a
          href={caseStudyHref}
          className={cn(
            "story-link text-sm font-medium",
            isNight ? "text-accent" : "text-accent",
          )}
        >
          {caseStudyLabel} →
        </a>
      )}
    </figure>
  );
}
