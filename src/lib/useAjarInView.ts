import { useEffect, useRef } from 'react'

/**
 * Touch-device stand-in for the hover-open door: on `(hover: none)` devices a
 * single shared IntersectionObserver adds `door-scene--ajar` while the card's
 * center crosses the middle ~30% band of the viewport, so doors drift open as
 * you scroll past them. No-op on hover devices and under reduced motion.
 */

let observer: IntersectionObserver | null = null

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle('door-scene--ajar', e.isIntersecting)
        }
      },
      { rootMargin: '-35% 0% -35% 0%' },
    )
  }
  return observer
}

export function useAjarInView<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!enabled) return
    if (!window.matchMedia('(hover: none)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    const obs = getObserver()
    obs.observe(el)
    return () => {
      obs.unobserve(el)
      el.classList.remove('door-scene--ajar')
    }
  }, [enabled])
  return ref
}
