import { cn } from "@/lib/utils";

type Tone = "light" | "warm" | "dark";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone;
  /** Largeur du conteneur interne. `false` = pas de conteneur (gère le tien). */
  container?: "default" | "narrow" | false;
  /** Padding vertical. `hero` = plus généreux. */
  spacing?: "section" | "hero" | "compact" | "none";
}

const toneClass: Record<Tone, string> = {
  light: "sec-light",
  warm: "sec-light sec-light--warm",
  dark: "sec-dark",
};

const spacingClass = {
  section: "py-20 md:py-[84px]",
  hero: "py-24 md:py-28",
  compact: "py-12 md:py-16",
  none: "",
};

const containerClass = {
  default: "mx-auto w-full max-w-[1180px] px-7 md:px-11",
  narrow: "mx-auto w-full max-w-[880px] px-7 md:px-11",
};

/**
 * Bloc de section de la charte v4.0.
 * `tone="dark"` applique automatiquement dégradé bleu nuit + halos + grain.
 */
export default function Section({
  tone = "light",
  container = "default",
  spacing = "section",
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section className={cn("relative", toneClass[tone], spacingClass[spacing], className)} {...rest}>
      {container ? <div className={containerClass[container]}>{children}</div> : children}
    </section>
  );
}
