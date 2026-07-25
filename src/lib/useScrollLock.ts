import { useEffect } from 'react'
import { pauseSmoothScroll, resumeSmoothScroll } from './smoothScroll'

/**
 * Freezes the page behind a full-screen overlay (cart drawer, mobile menu).
 *
 * `overflow: hidden` on <html> — not the `position: fixed` body trick — is what
 * stops touch scrolling on iOS while *keeping* the scroll offset: the portal
 * hero derives its phase from window.scrollY, and a fixed body would zero that
 * out and snap the door shut behind the overlay.
 *
 * Also parks Lenis (wheel inertia would keep firing scrollTo underneath) and
 * marks <body> so fixed chrome — the WhatsApp float — can step aside.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    const { body } = document
    const prevRoot = root.style.overflow
    const prevBody = body.style.overflow
    // the scrollbar disappearing on desktop would otherwise shift the layout
    const gap = window.innerWidth - root.clientWidth
    const prevPad = body.style.paddingRight

    pauseSmoothScroll()
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = `${gap}px`
    body.classList.add('has-overlay')

    return () => {
      root.style.overflow = prevRoot
      body.style.overflow = prevBody
      body.style.paddingRight = prevPad
      body.classList.remove('has-overlay')
      resumeSmoothScroll()
    }
  }, [active])
}
