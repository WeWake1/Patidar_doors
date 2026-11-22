import { Suspense, lazy, memo, useEffect, useRef, useState } from 'react'
import { smoothScrollTo } from '../lib/smoothScroll'
import { useDecorativeChunk } from '../lib/useDecorativeChunk'
import { easeInQuad, easeOutCubic, seg, useMediaQuery, useTrackProgress } from '../lib/useTrackProgress'
import { ErrorBoundary } from './ErrorBoundary'
import { HeroDoorPhoto } from './HeroDoorPhoto'
import { Corridor, HeroKicker, WORLD_ARTS, WorldCard } from './heroWorlds'
/* Beams pulls in three + @react-three/fiber + drei — ~220kB gzipped, which is
   most of the bundle. It is a decorative backdrop, so it must never sit in
   front of first paint on a phone: lazy-loaded into its own chunk, with
   .portal__rays' warm gradient standing in until it arrives (it fades in, so
   the swap doesn't pop). */
const Beams = lazy(() => import('./reactbits/Beams'))

/**
 * The portal hero: scroll swings the hero door open (phase A), pushes the
 * camera through the doorway (phase B), and lands in a corridor of four
 * world-doors (phase C/D). Transform + opacity only — nothing paint-heavy
 * animates during scroll. Falls back to a static layout under reduced motion.
 *
 * The world cards, the corridor and the kicker live in ./heroWorlds — shared
 * with the keyhole/tunnel hero prototyped beside this one.
 */

/* The headline and sub are fixed copy inside the scrubbed zoom block — same
   deal as the memoised corridor cards, and this one carries the LCP element. */
const HeroCopy = memo(function HeroCopy() {
  return (
    <>
      <HeroKicker className="rise" />
      <h1 className="hero__title rise rise--1">
        Walk right <em>in</em>.
      </h1>
      <p className="hero__sub rise rise--2">
        Teak timbers, made-to-measure doors, ply and WPC — all under one roof, straight from our factory floor.
      </p>
    </>
  )
})

export function HeroPortal() {
  const trackRef = useRef<HTMLElement>(null)
  const p = useTrackProgress(trackRef)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const mobile = useMediaQuery('(max-width: 720px)')
  /* Whether the beams chunk should be fetched on this device and this
     connection, and whether now is a good moment — false until the page has
     loaded and gone idle, so 230 kB of decorative WebGL stops queueing ahead of
     the hero photograph. */
  const beamsWanted = useDecorativeChunk()
  /* Whether the backdrop is worth *running* right now — see the Beams block
     below. Setting the same value bails out of the re-render, so this costs
     nothing on the frames in between. Must sit above the reduced-motion early
     return: hooks can't run conditionally. */
  const [beamsLive, setBeamsLive] = useState(true)
  useEffect(() => {
    setBeamsLive((live: boolean) => (live ? p < 0.62 : p < 0.5))
  }, [p])

  if (reduced) {
    return (
      <section className="portal portal--static">
        <div className="portal__stage portal__stage--static">
          <div className="portal__copy">
            <HeroKicker />
            <h1 className="hero__title">
              Walk right <em>in</em>.
            </h1>
            <p className="hero__sub">
              Teak timbers, made-to-measure doors, ply and WPC — all under one roof. Step through and pick your world.
            </p>
          </div>
          <div className="portal__scene">
            <HeroDoorPhoto openDeg={38}>
              <div className="portal__glow" aria-hidden="true" />
            </HeroDoorPhoto>
          </div>
        </div>
        <div className="portal__grid">
          {WORLD_ARTS.map((g) => (
            <WorldCard key={g.id} art={g} tabbable />
          ))}
        </div>
      </section>
    )
  }

  const angle = easeOutCubic(seg(p, 0, 0.25)) * 95
  const copyOpacity = 1 - seg(p, 0.15, 0.25)
  const maxScale = mobile ? 8 : 13
  const scale = 1 + easeInQuad(seg(p, 0.25, 0.55)) * (maxScale - 1)
  const zoomOpacity = 1 - seg(p, 0.45, 0.55)
  const corridorInteractive = p > 0.7

  const peek = () => {
    const el = trackRef.current
    if (!el) return
    const top = el.offsetTop
    const total = el.offsetHeight - window.innerHeight
    const target = p < 0.15 ? top + total * 0.3 : p < 0.5 ? top + total : top
    smoothScrollTo(target)
  }

  return (
    <section className="portal portal--dark" ref={trackRef}>
      <div className="portal__sticky">
        {/* Beams backdrop — only the opening phase; fades out before the corridor.
            beamWidth/Height are world units in front of a fov-30 camera at z=20,
            which sees ~17 units across: `beamWidth` alone sets how wide a beam
            reads (4 = broad slabs), while `beamNumber`/`beamHeight` only need to
            be large enough that the field's edges stay off-frame once rotated —
            a short beamHeight puts a hard diagonal seam across the corner.
            Speed stays under the demo's 2 — that fast, the noise crawling down
            the beams pulls the eye off the headline. */}
        <div
          className="portal__rays"
          style={{ opacity: zoomOpacity, visibility: zoomOpacity === 0 ? 'hidden' : 'visible' }}
          aria-hidden="true"
        >
          {/* If the three.js chunk 404s — the usual cause is a redeploy under an
              open tab — the hero must simply not have beams. Without a boundary
              the failed import throws through Suspense and takes the whole home
              page down over a decorative backdrop. `.portal__rays`' warm
              gradient is already the standing-in layer, so the fallback is
              nothing at all. */}
          <ErrorBoundary label="beams" fallback={null}>
            <Suspense fallback={null}>
            {/* Two gates, and both are load-bearing.

                `beamsWanted` decides whether the 230 kB chunk is fetched at
                all: not during first paint (it used to hold the connection from
                1193ms to 3615ms while the hero photo and every font waited
                behind it), and not on Save-Data or a 2g phone. Because
                React.lazy imports on first render, this gate IS the download.

                `beamsLive` decides whether it runs. `visibility: hidden` hides
                the canvas but does NOT stop @react-three/fiber's render loop —
                it kept issuing ~120 WebGL draw calls/sec through the corridor
                and all the way down the page, which is most of the hero's
                main-thread budget and all of its GPU one. Hysteresis (off above
                .62, back on below .5) so scrubbing across the edge can't thrash
                the WebGL context. */}
            {beamsWanted && beamsLive && (
              <Beams
                beamWidth={4}
                beamHeight={30}
                beamNumber={12}
                /* --beam-light. The CSS backdrop under this canvas is drawn to
                   the same colour and the same 30° rake so the fade between
                   them is a dissolve, not a change of scene — retune both or
                   neither. three needs a literal, so this is the one copy. */
                lightColor="#f2d18a"
                speed={2}
                noiseIntensity={1.5}
                 rotation={30}
              />
            )}
            </Suspense>
          </ErrorBoundary>
        </div>

        <div
          className="portal__zoom"
          style={{
            transform: `scale(${scale})`,
            opacity: zoomOpacity,
            visibility: zoomOpacity === 0 ? 'hidden' : 'visible',
            pointerEvents: p > 0.3 ? 'none' : 'auto',
          }}
        >
          <div className="portal__copy" style={{ opacity: copyOpacity }}>
            <HeroCopy />
          </div>

          <div className="portal__scene rise rise--3">
            <HeroDoorPhoto openDeg={angle} onLeafClick={peek}>
              <div className="portal__glow" aria-hidden="true" />
            </HeroDoorPhoto>
          </div>
        </div>

        {/* After the zoom block, not before it. Paint order is set by z-index
            (corridor 1, zoom 2), so this is free visually — but in the document
            the corridor's "Choose your world" was an <h2> standing ahead of the
            page's own <h1>, and a heading outline that opens on a subheading is
            the first thing a screen-reader user meets on this site. */}
        <Corridor p={p} interactive={corridorInteractive} />

        <button
          type="button"
          className="hero__scrollcue"
          style={{ opacity: copyOpacity, pointerEvents: copyOpacity > 0.3 ? 'auto' : 'none' }}
          onClick={peek}
          tabIndex={copyOpacity > 0.5 ? 0 : -1}
        >
          <span>Scroll — step inside</span>
          <span className="hero__arrow" aria-hidden="true">
            ↓
          </span>
        </button>
      </div>
    </section>
  )
}
