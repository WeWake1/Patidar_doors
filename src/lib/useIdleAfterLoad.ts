import { useEffect, useState } from 'react'

/**
 * True once the page has finished loading *and* the browser has had an idle
 * moment — the window for work that has to be **ready** early but must not be
 * **done** early.
 *
 * The door wall in the keyhole hero is the case this exists for. It cannot be
 * mounted on a scroll threshold: mounting it means resolving a lazy chunk,
 * evaluating it, inserting ~56 tiles and firing the first image requests, and
 * wherever that threshold sits it lands in the middle of the scrub as a single
 * visible hitch. It also cannot be mounted eagerly, because then it competes
 * with the hero's own photographs for the connection before anything has
 * painted.
 *
 * So: after `load` (every hero image is in by then), on the first idle
 * callback. Nothing about the wall is visible at that point, so unlike the
 * beams — where a `load` + idle delay was tried and reverted because the
 * backdrop visibly arrived late — there is nothing here for a late arrival to
 * spoil.
 *
 * ⚠️ The `timeout` is not decoration. A page that never goes idle would
 * otherwise never fire this, and the caller's fallback (a scroll threshold)
 * would be the thing that ran — which is the hitch this is avoiding.
 */
export function useIdleAfterLoad(timeout = 2000): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let idle = 0
    let timer = 0
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(() => setReady(true), { timeout })
      } else {
        // Older Safari. A short timer is the whole fallback: by `load` the
        // expensive part of startup is behind us either way.
        timer = window.setTimeout(() => setReady(true), 300)
      }
    }

    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })

    return () => {
      window.removeEventListener('load', schedule)
      if (idle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle)
      if (timer) clearTimeout(timer)
    }
  }, [timeout])

  return ready
}
