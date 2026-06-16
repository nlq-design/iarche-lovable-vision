import { cn } from "@/lib/utils";
import { useInViewReveal } from "@/hooks/useInViewReveal";

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Délai d'apparition en ms (effet staggered). */
  delay?: number;
  as?: "div" | "li" | "span";
}

/**
 * Révèle son contenu au scroll (charte v4.0 : opacity + translateY).
 * S'appuie sur le hook standard `useInViewReveal` (IntersectionObserver).
 */
export default function Reveal({ delay = 0, as = "div", className, style, children, ...rest }: RevealProps) {
  const { ref, inView } = useInViewReveal<HTMLDivElement>();
  const Comp = as as "div";
  return (
    <Comp
      ref={ref}
      className={cn("ds-reveal", inView && "is-visible", className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined, ...style }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
