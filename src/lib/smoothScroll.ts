import Lenis from 'lenis'
import { useEffect } from 'react'
import { useMediaQuery } from './useTrackProgress'

let lenis: Lenis | null = null

/**
 * Mounts an inertia smooth scroll for wheel/trackpad input across the
 * storefront. Touch is left native (syncTouch: false) — mobile scrolling
 * already feels smooth and the hero's touch-only `.door-scene--ajar` tuning
 * (useAjarInView) assumes untouched native scroll timing. Skipped entirely
 * under prefers-reduced-motion.
 */
export function useSmoothScroll(): void {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  useEffect(() => {
    if (reduced) return
    const instance = new Lenis({
      lerp: 0.12,
      smoothWheel: true,
      syncTouch: false,
    })
    lenis = instance
    let raf = 0
    const loop = (time: number) => {
      instance.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      instance.destroy()
      lenis = null
    }
  }, [reduced])
}

/** Pause/resume the wheel inertia while an overlay owns the screen (useScrollLock). */
export function pauseSmoothScroll(): void {
  lenis?.stop()
}
export function resumeSmoothScroll(): void {
  lenis?.start()
}

/**
 * Programmatic scroll that goes through the live Lenis instance when one is
 * mounted — calling native scrollTo/scrollIntoView instead would fight
 * Lenis's internal target-scroll tracking (it'd snap back on the next wheel
 * tick). Falls back to native smooth scroll when Lenis isn't running
 * (reduced motion, or not yet mounted).
 *
 * `duration` (seconds) swaps Lenis's lerp for a fixed-length ease. Worth it
 * for long jumps: the lerp is asymptotic, so it crawls the last stretch and a
 * full-track glide reads as if it stalled. Ignored by the native fallback.
 */
export function smoothScrollTo(
  target: number | HTMLElement,
  opts?: { offset?: number; immediate?: boolean; duration?: number },
): void {
  if (lenis) {
    lenis.scrollTo(target, { offset: opts?.offset, immediate: opts?.immediate, duration: opts?.duration })
    return
  }
  const behavior = opts?.immediate ? 'instant' : 'smooth'
  if (typeof target === 'number') {
    window.scrollTo({ top: target + (opts?.offset ?? 0), behavior })
  } else {
    target.scrollIntoView({ behavior, block: 'center' })
  }
}
