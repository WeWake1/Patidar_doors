import { Suspense, lazy, useRef } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { useNearViewport } from '../lib/useNearViewport'

/**
 * The door wall's place on the home page — and the only thing that imports it.
 *
 * Two separate jobs, both of which have to happen *outside* the component:
 *
 * 1. **Weight.** `Home` is one of only two eager routes (see App.tsx), so a
 *    plain import would put `DriftWall`, the photo manifest and 28 thumbnail
 *    URLs into the entry bundle — the bundle that decides first paint on a
 *    client-rendered site. The lazy boundary has to live in a module Home can
 *    import without dragging any of that along, which is why this file is a
 *    separate one rather than an export of DoorWall.tsx.
 *
 * 2. **Frames.** `DriftWall` runs an unconditional rAF; mounting it at the top
 *    of the page would leave that loop running underneath the hero scrub. See
 *    `useNearViewport`.
 *
 * The reserve keeps the band's height (and its colour) in the page before the
 * chunk lands, so the sections below it don't shift. It doesn't have to be
 * exact — the mount fires a full viewport early, so any correction happens
 * off-screen.
 */
const DoorWall = lazy(() => import('./DoorWall').then((m) => ({ default: m.DoorWall })))

export function DoorWallSlot() {
  const ref = useRef<HTMLDivElement>(null)
  const live = useNearViewport(ref)

  return (
    <div ref={ref}>
      {live ? (
        // Decorative: a stale chunk after a redeploy should cost the band and
        // nothing else, so this fails to no band rather than to a crash screen.
        <ErrorBoundary label="door-wall" fallback={null}>
          <Suspense fallback={<div className="doorwall-hold" aria-hidden="true" />}>
            <DoorWall />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <div className="doorwall-hold" aria-hidden="true" />
      )}
    </div>
  )
}
