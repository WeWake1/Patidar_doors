/**
 * Is handheld AR available on this device at all?
 *
 * This is the gate that keeps the whole feature honest. WebXR's `immersive-ar`
 * exists in Chrome on Android and is backed by ARCore, which is **not** on
 * every Android — it is a device allow-list, and the phones that fall off it
 * are exactly the mid-range ones this store is browsed on. Safari on iOS does
 * not implement the WebXR Device API at all, on any device, with no announced
 * plan to; see docs/live-ar-plan.md for why that was accepted rather than
 * worked around.
 *
 * So the rule is: **AR is an addition that appears where it works, and is
 * invisible everywhere else.** The photo flow is not a fallback for it — the
 * photo flow is the feature, and it is complete on its own. Nothing here ever
 * renders a disabled button, an "unsupported" notice or a nudge to switch
 * phones; a visitor on an iPhone should not be able to tell that a second mode
 * exists. That is also what makes this safe to ship: the failure mode of the
 * entire feature is that it does not appear.
 *
 * ⚠️ Detection is asynchronous and must never throw. `navigator.xr` is
 * undefined outside a secure context, `isSessionSupported` rejects rather than
 * resolving false in some builds, and a browser extension can replace the whole
 * object. All three land on "no".
 */

import { useEffect, useState } from 'react'

/** Minimal shape — see the note in arScene.ts on why @types/webxr is not a dep. */
type XRSystemLike = { isSessionSupported?: (mode: string) => Promise<boolean> }

/**
 * Resolved once per page load, then reused. The answer cannot change without a
 * navigation, and `isSessionSupported` is a real IPC round trip to ARCore on
 * Android — worth not repeating on every mount.
 */
let cached: Promise<boolean> | null = null

export function isArSupported(): Promise<boolean> {
  if (cached) return cached
  cached = (async () => {
    try {
      const xr = (navigator as Navigator & { xr?: XRSystemLike }).xr
      if (!xr?.isSessionSupported) return false
      return (await xr.isSessionSupported('immersive-ar')) === true
    } catch {
      return false
    }
  })()
  return cached
}

/**
 * False until proven otherwise, and it only ever flips one way.
 *
 * Starting at false is deliberate: the pick step renders immediately with the
 * two photo buttons, and the AR button appears a beat later on the devices that
 * have it. The reverse — reserving space for a button that usually never
 * arrives — would put a hole in the layout of every iPhone.
 */
export function useArSupport(): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let live = true
    isArSupported().then((v) => {
      if (live && v) setOk(true)
    })
    return () => {
      live = false
    }
  }, [])
  return ok
}
