import { Suspense, lazy, memo, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ArtId, Tone, WorldId } from '../data/products'
import { WOOD_TONES } from '../data/products'
import { WORLDS } from '../data/worlds'
import { smoothScrollTo } from '../lib/smoothScroll'
import { useDecorativeChunk } from '../lib/useDecorativeChunk'
import { easeInQuad, easeOutCubic, seg, useMediaQuery, useTrackProgress } from '../lib/useTrackProgress'
import { DoorArt } from './DoorArt'
import { ErrorBoundary } from './ErrorBoundary'
import { HeroDoorPhoto } from './HeroDoorPhoto'
import { MaterialArt } from './MaterialArt'
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
 */

const t = (id: string, name: string, base: string, dark: string, light: string, grain = true): Tone => ({
  id,
  name,
  base,
  dark,
  light,
  grain,
  delta: 0,
})

/**
 * Each world is one card showing its material full-bleed: timber/ply/wpc use
 * the generated MaterialArt swatch, doors a DoorArt leaf. `tone` tints the
 * card's frame accent + rule (via --wd).
 */
type WorldArt =
  | { id: WorldId; kind: 'door'; art: ArtId; tone: Tone }
  | { id: WorldId; kind: 'material'; material: 'timber' | 'ply' | 'wpc'; tone: Tone }

/* Material colours are the real thing, not the world's brand accent (which
   stays on the frame/rule): teak amber, a golden-teak leaf, pale birch ply,
   and a muted slate-green WPC — a saturated teal board read as a toy. */
const WORLD_ARTS: WorldArt[] = [
  { id: 'timbers', kind: 'material', material: 'timber', tone: t('w-timbers', 'Amber Teak', '#8a6234', '#63431f', '#ab8149') },
  { id: 'doors', kind: 'door', art: 'classic', tone: WOOD_TONES[1] },
  { id: 'ply', kind: 'material', material: 'ply', tone: t('w-ply', 'Birch Ply', '#c3a279', '#8c6c45', '#e0c8a4') },
  { id: 'wpc', kind: 'material', material: 'wpc', tone: t('w-wpc', 'Slate Green', '#5d7b76', '#3d5854', '#8ba5a1', false) },
]

/**
 * The card's contents, split out and memoised because they never change while
 * the card itself is scroll-scrubbed.
 *
 * The corridor re-renders on every frame of the reveal — that is the whole
 * point of it — but the only thing that actually differs frame to frame is the
 * opacity/transform on the Link. Behind that sit ~180 static SVG nodes across
 * the four cards: three feTurbulence-displaced material swatches and a drawn
 * door leaf. React was reconciling all of them sixty times a second to apply a
 * transform on their grandparent, and that reconciliation was most of the
 * hero's main-thread budget (measured: 395ms of scripting across a 2.1s scroll,
 * a third of the main thread, on a 4x-throttled phone).
 *
 * `art` is one of the module-level WORLD_ARTS constants, so this renders once
 * and then never again.
 */
const WorldCardInner = memo(function WorldCardInner({ art }: { art: WorldArt }) {
  const world = WORLDS.find((w) => w.id === art.id)!
  return (
    <>
      <span className={`wcard__art wcard__art--${art.kind}`} aria-hidden="true">
        {art.kind === 'door' ? (
          <DoorArt art={art.art} tone={art.tone} />
        ) : (
          <MaterialArt
            material={art.material}
            base={art.tone.base}
            dark={art.tone.dark}
            light={art.tone.light}
            seed={`world-${art.id}`}
          />
        )}
        <span className="wcard__scrim" />
        <span className="wcard__frame" />
      </span>
      <span className="wcard__body">
        <span className="wcard__name">{world.short}</span>
        <span className="wcard__tag">{world.tagline}</span>
      </span>
    </>
  )
})

function WorldCard({ art, style, tabbable }: { art: WorldArt; style?: React.CSSProperties; tabbable: boolean }) {
  return (
    <Link
      to={`/${art.id}`}
      className={`wcard wcard--${art.id}`}
      style={{ ...style, '--wd': art.tone.base } as React.CSSProperties}
      tabIndex={tabbable ? 0 : -1}
    >
      <WorldCardInner art={art} />
    </Link>
  )
}

/**
 * "Our yard · Our factory · Our store" — each phrase is atomic so a narrow
 * screen breaks between them, never mid-phrase ("OUR YARD · OUR / FACTORY…").
 *
 * Memoised for the same reason as WorldCardInner: it sits inside the zoom
 * block, whose opacity is rewritten every frame.
 */
const HeroKicker = memo(function HeroKicker({ className }: { className?: string }) {
  return (
    <div className={`hero__kicker${className ? ` ${className}` : ''}`}>
      {['Our yard', 'Our factory', 'Our store'].map((phrase, i, all) => (
        <span key={phrase} className="hero__kicker-part">
          {phrase}
          {/* separator trails its phrase, so a wrap never starts a line with "·" */}
          {i < all.length - 1 && (
            <span className="hero__kicker-sep" aria-hidden="true">
              ·
            </span>
          )}
        </span>
      ))}
    </div>
  )
})

/* The headline and sub are fixed copy inside the scrubbed zoom block — same
   deal, and this one carries the LCP element. */
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

function Corridor({ p, interactive }: { p: number; interactive: boolean }) {
  const heading = seg(p, 0.8, 0.88)
  return (
    <div
      className="portal__corridor"
      style={{
        opacity: seg(p, 0.45, 0.58),
        visibility: p > 0.45 ? 'visible' : 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <div className="portal__hall" aria-hidden="true" />
      <div className="portal__corridor-head" style={{ opacity: heading, transform: `translateY(${(1 - heading) * 14}px)` }}>
        <div className="kicker kicker--gold">Step into the store</div>
        <h2>Choose your world</h2>
      </div>
      <div className="portal__doors">
        {WORLD_ARTS.map((g, i) => {
          const s = seg(p, 0.56 + i * 0.07, 0.66 + i * 0.07)
          return (
            <WorldCard
              key={g.id}
              art={g}
              tabbable={interactive}
              style={{ opacity: s, transform: `translateY(${(1 - s) * 48}px)` }}
            />
          )
        })}
      </div>
    </div>
  )
}

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
