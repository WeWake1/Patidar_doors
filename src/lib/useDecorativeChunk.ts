import { useEffect, useState } from 'react'

/**
 * Capability gate for a large, purely decorative lazy chunk — currently just
 * the hero's WebGL beams, which are ~230 kB gzipped, more than the rest of the
 * site put together.
 *
 * It decides *whether*, not *when*. An earlier version of this also deferred
 * the fetch until `window.load` plus an idle callback, and that was a mistake
 * worth recording: `load` waits on every image on the page, so on the real home
 * page the backdrop arrived long after the hero photograph and the copy had
 * settled, which reads as a fault rather than as a load. Measurement also
 * showed the deferral bought nothing — the chunk cannot start until the bundle
 * has parsed and rendered the hero either way, so gated and ungated finished
 * within ~50ms of each other on every connection tested. So it fires on mount.
 *
 * What remains is the part that does pay: don't fetch it at all where it can't
 * pay for itself. Save-Data is an explicit request not to spend the visitor's
 * money, and on 2g the download would still be arriving after they had scrolled
 * past it. `.portal__rays` is drawn to look like the beams, so those visitors
 * get the composition without the 230 kB — see the note above it in global.css.
 *
 * Deliberately NOT gated on 3g or on core count: a mid-range Android on 3g is
 * this site's *typical* visitor, not its edge case, and the hero is the one
 * place the brand gets to make an impression on them.
 */

/* navigator.connection is Chromium-only and still unprefixed-experimental, so
   it is typed here rather than pulled from lib.dom. */
type NetworkInfo = { saveData?: boolean; effectiveType?: string }

function worthFetching(): boolean {
  const nav = navigator as Navigator & { connection?: NetworkInfo; deviceMemory?: number }
  const net = nav.connection
  if (net?.saveData) return false
  if (net?.effectiveType === 'slow-2g' || net?.effectiveType === '2g') return false
  /* deviceMemory is bucketed and bottoms out at 0.25; <2 is a genuinely
     memory-starved phone, not merely a cheap one. */
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 2) return false
  return true
}

/**
 * True from the first commit unless this device opted out, in which case it
 * stays false forever. Never flips back, so the chunk is fetched at most once.
 */
export function useDecorativeChunk(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (worthFetching()) setReady(true)
  }, [])
  return ready
}
