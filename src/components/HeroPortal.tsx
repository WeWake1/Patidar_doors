import { Suspense, lazy, useCallback, useEffect, useRef, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import type { ArtId, Tone, WorldId } from '../data/products'
import { WOOD_TONES } from '../data/products'
import { WORLDS } from '../data/worlds'
import { smoothScrollTo } from '../lib/smoothScroll'
import { easeInQuad, easeOutCubic, seg, useMediaQuery, useTrackProgress } from '../lib/useTrackProgress'
import { DoorArt } from './DoorArt'
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
  { id: 'doors', kind: 'door', art: 'meridian', tone: WOOD_TONES[1] },
  { id: 'ply', kind: 'material', material: 'ply', tone: t('w-ply', 'Birch Ply', '#c3a279', '#8c6c45', '#e0c8a4') },
  { id: 'wpc', kind: 'material', material: 'wpc', tone: t('w-wpc', 'Slate Green', '#5d7b76', '#3d5854', '#8ba5a1', false) },
]

function WorldCard({ art, style, tabbable }: { art: WorldArt; style?: React.CSSProperties; tabbable: boolean }) {
  const world = WORLDS.find((w) => w.id === art.id)!
  return (
    <Link
      to={`/${art.id}`}
      className={`wcard wcard--${art.id}`}
      style={{ ...style, '--wd': art.tone.base } as React.CSSProperties}
      tabIndex={tabbable ? 0 : -1}
    >
      <span className={`wcard__art wcard__art--${art.kind}`} aria-hidden="true">
        {art.kind === 'door' ? (
          <DoorArt art={art.art} tone={art.tone} />
        ) : (
          <MaterialArt material={art.material} base={art.tone.base} dark={art.tone.dark} light={art.tone.light} />
        )}
        <span className="wcard__scrim" />
        <span className="wcard__frame" />
      </span>
      <span className="wcard__body">
        <span className="wcard__name">{world.short}</span>
        <span className="wcard__tag">{world.tagline}</span>
      </span>
    </Link>
  )
}

/**
 * "Our yard · Our factory · Our store" — each phrase is atomic so a narrow
 * screen breaks between them, never mid-phrase ("OUR YARD · OUR / FACTORY…").
 */
function HeroKicker({ className }: { className?: string }) {
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
}

/* ── auto push-through ─────────────────────────────────────
   The door swing (0–.25) is the reader's to scrub. Everything after it is a
   cutscene: stopping half-way through the zoom parks the hero inside a
   blurred doorway, which reads as broken rather than as a pause. So the frame
   the door finishes opening, the rest of the track is handed to one
   programmatic glide that lands on the corridor.

   It fires on the crossing, not on the scroll going quiet. Waiting for idle
   meant waiting out Lenis's inertia tail first, so a reader who stopped sat
   in the blur for the best part of a second before anything moved. Taking
   over mid-flick costs nothing — Lenis just retargets the scroll it is
   already animating. */
const AUTO_FROM = 0.26 // the swing finishes at .25
const AUTO_TO = 0.92 // corridor settled — last card lands at .87, heading at .88
const AUTO_REARM = 0.18 // back at the door: allow the push-through again
const AUTO_MS = 950 // fixed duration beats the lerp, which crawls the last 10%

function useAutoPushThrough(trackRef: RefObject<HTMLElement | null>, p: number, enabled: boolean) {
  /* armed starts false so a reload restoring mid-track scroll doesn't yank the
     page; the first frame at the top of the track arms it */
  const st = useRef({ armed: false, touching: false, pending: false })

  const run = useCallback(() => {
    const s = st.current
    const el = trackRef.current
    if (!el) return
    s.armed = false
    s.pending = false
    smoothScrollTo(el.offsetTop + Math.max(1, el.offsetHeight - window.innerHeight) * AUTO_TO, {
      duration: AUTO_MS / 1000,
    })
  }, [trackRef])

  /* A finger on the glass owns the scroll — taking over mid-drag would rip the
     page out from under it, so that one case defers to the lift. */
  useEffect(() => {
    if (!enabled) return
    const s = st.current
    const down = () => {
      s.touching = true
    }
    const up = () => {
      s.touching = false
      /* next frame, not inline: Lenis's own touch handling runs after ours and
         swallows a scrollTo issued from inside the touchend handler */
      if (s.pending) requestAnimationFrame(run)
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    window.addEventListener('touchcancel', up, { passive: true })
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
      window.removeEventListener('touchcancel', up)
      s.touching = false
      s.pending = false
    }
  }, [enabled, run])

  useEffect(() => {
    if (!enabled) return
    const s = st.current
    if (p < AUTO_REARM) s.armed = true
    if (!s.armed || p < AUTO_FROM || p >= AUTO_TO) return
    /* an overlay owns the screen (Lenis is parked) — wait for it to close */
    if (document.body.classList.contains('has-overlay')) return
    if (s.touching) {
      s.pending = true
      return
    }
    run()
  }, [p, enabled, run])
}

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
  useAutoPushThrough(trackRef, p, !reduced)

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

  /* Cue / leaf click. Below the corridor it runs the whole thing in one glide
     rather than the old nudge to .3 — that landed inside the push-through,
     where useAutoPushThrough would immediately take over and the reader saw
     two separate animations for one click. */
  const peek = () => {
    const el = trackRef.current
    if (!el) return
    const top = el.offsetTop
    const total = el.offsetHeight - window.innerHeight
    smoothScrollTo(p < AUTO_TO ? top + total * AUTO_TO : top, { duration: AUTO_MS / 1000 })
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
            Speed is half the demo's; at 2 the noise crawls fast enough to
            distract from the headline. */}
        <div
          className="portal__rays"
          style={{ opacity: zoomOpacity, visibility: zoomOpacity === 0 ? 'hidden' : 'visible' }}
          aria-hidden="true"
        >
          <Suspense fallback={null}>
            <Beams
              beamWidth={4}
              beamHeight={30}
              beamNumber={12}
              lightColor="#f2d18a"
              speed={1}
              noiseIntensity={1.5}
              scale={0.2}
              rotation={30}
            />
          </Suspense>
        </div>

        <Corridor p={p} interactive={corridorInteractive} />

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
            <HeroKicker className="rise" />
            <h1 className="hero__title rise rise--1">
              Walk right <em>in</em>.
            </h1>
            <p className="hero__sub rise rise--2">
              Teak timbers, made-to-measure doors, ply and WPC — all under one roof, straight from our factory floor.
            </p>
          </div>

          <div className="portal__scene rise rise--3">
            <HeroDoorPhoto openDeg={angle} onLeafClick={peek}>
              <div className="portal__glow" aria-hidden="true" />
            </HeroDoorPhoto>
          </div>
        </div>

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
