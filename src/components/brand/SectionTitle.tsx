import { cn } from "@/lib/utils";
import Eyebrow from "./Eyebrow";
import AnimatedArc from "./AnimatedArc";

interface SectionTitleProps {
  /** Kicker mono ✦ au-dessus du titre. */
  eyebrow?: React.ReactNode;
  /** Le titre. Utilise <em>…</em> pour les mots en rosé/flame. */
  children: React.ReactNode;
  /** Sous-titre / lede sous le titre. */
  lede?: React.ReactNode;
  center?: boolean;
  /** Affiche l'arc animé sous le titre (signature). */
  arc?: boolean;
  as?: "h1" | "h2" | "h3";
  className?: string;
  titleClassName?: string;
}

/** Titre de section charte v4.0 : eyebrow mono + titre clamp (em rosé) + arc animé. */
export default function SectionTitle({
  eyebrow,
  children,
  lede,
  center,
  arc = true,
  as: Tag = "h2",
  className,
  titleClassName,
}: SectionTitleProps) {
  return (
    <div className={cn(center && "text-center flex flex-col items-center", className)}>
      {eyebrow && <Eyebrow center={center}>{eyebrow}</Eyebrow>}
      <Tag
        className={cn(
          "section-title font-semibold tracking-[-0.025em] leading-[1.04]",
          "text-[clamp(34px,5vw,60px)] max-w-[18ch]",
          titleClassName,
        )}
      >
        {children}
      </Tag>
      {arc && <AnimatedArc center={center} />}
      {lede && (
        <p className={cn("ds-lede mt-5 max-w-[56ch] text-text-subtle", center && "mx-auto")}>{lede}</p>
      )}
    </div>
  );
}
