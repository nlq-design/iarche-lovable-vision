/**
 * Motion primitives — Lot D1
 * Variants Framer Motion partagés pour cohérence des animations site public.
 * Respecte prefers-reduced-motion via Framer Motion (MotionConfig reducedMotion).
 */
import type { Variants, Transition } from "framer-motion";

export const easeOutExpo: Transition["ease"] = [0.16, 1, 0.3, 1];
export const easeOutQuint: Transition["ease"] = [0.22, 1, 0.36, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOutExpo },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: easeOutExpo } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

export const staggerContainer = (stagger = 0.08, delayChildren = 0.05): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

export const revealMask: Variants = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  show: {
    clipPath: "inset(0 0 0 0)",
    transition: { duration: 0.9, ease: easeOutQuint },
  },
};

/** Viewport par défaut pour whileInView */
export const defaultViewport = { once: true, margin: "-80px" } as const;
