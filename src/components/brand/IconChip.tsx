import { cn } from "@/lib/utils";

type Variant = "terra" | "navy" | "soft" | "olive";

interface IconChipProps {
  variant?: Variant;
  /** Sur fond sombre = halos lumineux ; sinon aplats teintés. */
  dark?: boolean;
  children: React.ReactNode;
  className?: string;
}

const light: Record<string, string> = {
  terra: "ds-chip--terra-l",
  navy: "ds-chip--navy-l",
  soft: "ds-chip--terra-l",
  olive: "ds-chip--olive-l",
};
const dark: Record<string, string> = {
  terra: "ds-chip--d ds-chip--terra-d",
  navy: "ds-chip--d ds-chip--terra-d",
  soft: "ds-chip--d ds-chip--soft-d",
  olive: "ds-chip--d ds-chip--olive-d",
};

/** Tuile d'icône (charte v4.0). */
export default function IconChip({ variant = "terra", dark: isDark, children, className }: IconChipProps) {
  return (
    <span className={cn("ds-chip", (isDark ? dark : light)[variant], className)}>{children}</span>
  );
}
