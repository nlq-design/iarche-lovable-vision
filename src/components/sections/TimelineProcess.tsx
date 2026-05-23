import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { ReactNode } from "react";

export interface TimelineStep {
  label: string;
  title: string;
  description: string;
  icon?: ReactNode;
}

interface TimelineProcessProps {
  steps: TimelineStep[];
  className?: string;
}

/**
 * TimelineProcess — méthodologie/parcours en timeline verticale (Lot D2).
 * Indicateurs numérotés, ligne Night Blue, hover terracotta.
 */
export function TimelineProcess({ steps, className }: TimelineProcessProps) {
  return (
    <ol className={cn("relative space-y-10 md:space-y-14", className)}>
      <span
        aria-hidden
        className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-primary/30 via-primary/15 to-transparent md:left-6"
      />
      {steps.map((step, i) => (
        <li key={i} className="relative grid grid-cols-[2.5rem_1fr] gap-5 md:grid-cols-[3rem_1fr] md:gap-8">
          <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle bg-background text-primary shadow-soft-sm md:h-12 md:w-12">
            {step.icon ?? <span className="text-sm font-semibold tabular-nums">{String(i + 1).padStart(2, "0")}</span>}
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Eyebrow tone="accent">{step.label}</Eyebrow>
            <h3 className="text-h4 text-primary">{step.title}</h3>
            <p className="text-base text-text-subtle md:max-w-xl">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
