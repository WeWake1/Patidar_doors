import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * True while the element is within `near` of the viewport, false again once it
 * is further than `far`. Two boundaries, not one, so a visitor parked exactly
 * on the edge can't thrash a mount/unmount cycle.
 *
 * This exists for the same reason the hero's beams are conditionally mounted:
 * a decorative subtree that runs its own rAF keeps running when it is
 * off-screen. `DriftWall` writes a transform to every tile on every frame for
 * the whole life of the component, and the door wall now sits below a 520vh
 * hero — so an ungated mount would have that loop competing with the hero
 * scrub, which is the one phase on this site that must stay smooth on a phone.
 *
 * Margins are percentages of the viewport, so the reserve scales with the
 * screen instead of being a desktop number a phone inherits.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  { near = '100%', far = '220%' }: { near?: string; far?: string } = {},
): boolean {
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Same posture as the rest of the site's progressive bits: if the browser
    // can't tell us, show the thing rather than hide it forever.
    if (typeof IntersectionObserver === 'undefined') {
      setLive(true)
      return
    }

    const enter = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setLive(true)
      },
      { rootMargin: near },
    )
    const leave = new IntersectionObserver(
      ([e]) => {
        if (e && !e.isIntersecting) setLive(false)
      },
      { rootMargin: far },
    )
    enter.observe(el)
    leave.observe(el)
    return () => {
      enter.disconnect()
      leave.disconnect()
    }
  }, [ref, near, far])

  return live
}
