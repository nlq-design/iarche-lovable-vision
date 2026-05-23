/**
 * Motion primitives — Lot D1
 * Variants compatibles Framer Motion / Motion-for-React (objet pur, sans import direct
 * pour ne pas forcer la dépendance tant qu'aucune page ne l'utilise).
 * Respecter prefers-reduced-motion via <MotionConfig reducedMotion="user"> côté consommateur.
 */

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeOutQuint = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOutExpo },
  },
} as const;

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: easeOutExpo } },
} as const;

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
} as const;

export const staggerContainer = (stagger = 0.08, delayChildren = 0.05) => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

export const revealMask = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  show: {
    clipPath: "inset(0 0 0 0)",
    transition: { duration: 0.9, ease: easeOutQuint },
  },
} as const;

/** Viewport par défaut pour whileInView */
export const defaultViewport = { once: true, margin: "-80px" } as const;
