import { useEffect, useRef, RefObject } from 'react';

/**
 * Pause les animations CSS quand l'élément est hors viewport
 * Reprend automatiquement quand l'élément redevient visible
 */
export function useAnimationPause<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Pause/resume toutes les animations de l'élément et ses enfants
        const animatedElements = element.querySelectorAll('*');
        const allElements = [element, ...Array.from(animatedElements)];
        
        allElements.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
          }
        });
      },
      { 
        threshold: 0,
        rootMargin: '50px' // Démarre légèrement avant d'être visible
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Version pour plusieurs refs (grilles de cards par exemple)
 */
export function useAnimationPauseMultiple<T extends HTMLElement>(
  count: number
): RefObject<T>[] {
  const refs = useRef<RefObject<T>[]>(
    Array.from({ length: count }, () => ({ current: null }))
  );

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    refs.current.forEach((ref) => {
      const element = ref.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (element instanceof HTMLElement) {
            element.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
          }
        },
        { threshold: 0, rootMargin: '50px' }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, [count]);

  return refs.current;
}
