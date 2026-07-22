import { useEffect, useRef } from 'react'

/**
 * Touch-device stand-in for hover effects: on `(hover: none)` devices a shared
 * IntersectionObserver adds an "active" class while the card's centre crosses
 * the middle ~30% band of the viewport, so the effect (door swing, or showcase
 * zoom) plays as you scroll past. No-op on hover devices and under reduced
 * motion. `activeClass` defaults to the door swing.
 */

const observers = new Map<string, IntersectionObserver>()

function getObserver(activeClass: string): IntersectionObserver {
  let obs = observers.get(activeClass)
  if (!obs) {
    obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.target.classList.toggle(activeClass, e.isIntersecting)
      },
      { rootMargin: '-35% 0% -35% 0%' },
    )
    observers.set(activeClass, obs)
  }
  return obs
}

export function useAjarInView<T extends HTMLElement>(enabled: boolean, activeClass = 'door-scene--ajar') {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!enabled) return
    if (!window.matchMedia('(hover: none)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    const obs = getObserver(activeClass)
    obs.observe(el)
    return () => {
      obs.unobserve(el)
      el.classList.remove(activeClass)
    }
  }, [enabled, activeClass])
  return ref
}
