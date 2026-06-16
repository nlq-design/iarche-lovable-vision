import Logo from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

interface SignoffProps {
  /** Slogan (utilise <em> pour le mot en rosé). */
  slogan: React.ReactNode;
  baseline?: React.ReactNode;
  className?: string;
}

/** Signoff de bas de page : logo centré + slogan em rosé + baseline (charte v4.0). */
export default function Signoff({ slogan, baseline, className }: SignoffProps) {
  return (
    <div className={cn("ds-signoff", className)}>
      <div className="mx-auto w-[200px] max-w-[60%]">
        <Logo variant="main" size="lg" />
      </div>
      <p className="ds-signoff-slogan mt-6">{slogan}</p>
      {baseline && <p className="ds-signoff-baseline">{baseline}</p>}
    </div>
  );
}
