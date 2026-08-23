import { Suspense, lazy, memo, useEffect, useRef, useState } from 'react'
import { LEAF_IMAGES } from '../data/leaves.gen'
import { smoothScrollTo } from '../lib/smoothScroll'
import { useDecorativeChunk } from '../lib/useDecorativeChunk'
import { clamp01, easeInQuad, easeOutCubic, seg, useMediaQuery, useTrackProgress } from '../lib/useTrackProgress'
import { ErrorBoundary } from './ErrorBoundary'
import { HeroDoorPhoto } from './HeroDoorPhoto'
import { HeroKicker, WORLD_ARTS, WorldCard } from './heroWorlds'

const Beams = lazy(() => import('./reactbits/Beams'))
/* The wall is the hero's landing, so unlike the standalone band it cannot be
   gated on `useNearViewport` — inside a sticky pane it is on screen for the
   whole track. It is gated on progress instead, and mounted paused; see
   `wallMounted` / `wallLive` below. */
const DoorWall = lazy(() => import('./DoorWall').then((m) => ({ default: m.DoorWall })))

/**
 * The keyhole hero: you are outside, looking through a keyhole (phase A); the
 * keyhole opens up around you and you fly down a corridor of real doors, each
 * swinging open as you reach it and whipping past the camera (phase B); the
 * last door opens onto the Door Wall — every door in the store, drifting —
 * and holds there (phase C).
 *
 * Phase C was the four world cards until 2026-08-23. The wall is the better
 * payoff and it is the one the animation has been promising: a tunnel that
 * spends its whole height on real doors should not hand you four abstract
 * material swatches at the end of it. The worlds move down the page as
 * `WorldsBand`.
 *
 * Prototyped 2026-08-21 beside HeroPortal, which it is a candidate to replace.
 * Both render the same Corridor from ./heroWorlds; `?hero=old` in Home swaps
 * back for a side-by-side.
 *
 * Two things it is trying to fix about the portal hero. It is shorter — 380vh
 * against 520 — because the payoff of the old one was a nav menu that is also
 * in the header and the footer. And the doors flying past are *photographs of
 * doors we actually stock*, so the scroll spends its height showing stock
 * rather than showing a transition.
 */

/* ── phases, as slices of track progress ────────────────────────────────────
   They overlap on purpose: the tunnel is already running behind the keyhole
   (so there is a door approaching in the dark before the hole opens), and the
   last door whips past just as the corridor starts to fade up. Nothing here
   should ever come to a stop — the whole hero is one forward move. */
const KEYHOLE_END = 0.28
const TUNNEL = [0.13, 0.7] as const
/* ⚠️ The corridor has to start BEFORE the last door has finished passing, or
   there is a dead frame between them. The first cut ran the tunnel to 0.76 and
   opened the corridor at 0.72, and because the corridor's own fade takes a
   further stretch to reach full strength the screen was empty black from about
   0.67 to 0.80 — a third of a second of nothing, at the exact moment the hero
   is supposed to be arriving somewhere. You now fly through the last door INTO
   the corridor, which is also the only reading that makes sense of it. */
/* The wall's fade. It starts well before the last door passes (~0.62) so that
   the final leaf opens onto a wall that is already lit — the arrival is one
   move, not a cut. Everything after WALL_FULL is dwell: the pane holds, the
   wall drifts, and you read it at your own pace before the sticky releases. */
const WALL_IN = 0.46
const WALL_FULL = 0.66

/* ── the tunnel, in world px in front of a CSS `perspective` of 900 ─────────
   A door's on-screen size is 900/(900 - z), so z = 0 is life-size and z
   approaching +900 is the camera itself. NEAR is where we cut it: past that
   the scale runs away and one leaf is the whole screen.

   SPACING sets how far apart the doors stand, and therefore the rhythm — the
   whole run of them is paced by exactly one number. BACK just holds the field
   further away at u=0 so the first door has somewhere to come *from*. */
const PERSPECTIVE = 900
const SPACING = 900
const BACK = 400
/* NEAR is where a door is cut, and it is the single number that decides
   whether this reads as flying *through* doors or watching them from a seat.
   900/(900 − 700) is 4.5×, so a leaf ends up around three screens tall and
   genuinely engulfs the camera on the way past. The first cut of this was 380
   (1.7×), and every door politely faded out at about the size it had been all
   along — five near-identical frames instead of five fly-bys. */
const NEAR = 700
/* ⚠️ A phone cuts the pass much earlier. A door is about 0.42 as wide as it is
   tall, so on a portrait screen it reaches the full width long after it has
   overflowed top and bottom — at 4.5× all that is left on a 390px viewport is
   the inside of the jamb, an empty brown box with the leaf swung off-screen.
   2.6× is as close as a phone can come and still be looking at a door. */
const NEAR_MOBILE = 560
/* fog: a door emerges from the dark rather than popping in at full strength */
const FOG_IN = -5200
const FOG_FULL = -3000

/* Doors do not all fly through the exact centre of the screen. World-px
   offsets, so they foreshorten with distance like everything else: far enough
   off-axis to feel like travel, near enough that the corridor still reads as
   one you are walking straight down. */
const OFFSETS: [number, number][] = [
  [0, 0],
  [-54, 12],
  [46, -16],
  [-40, -8],
  [58, 18],
]
/* A phone has no width to spare: the same offsets walk a door that is already
   wider than the viewport clean off the side of it. */
const OFFSET_SCALE_MOBILE = 0.35

/**
 * Real doors, in the order you fly through them — solid Burma teak first,
 * WPC last, so the run reads as a tour of the floor rather than five of the
 * same thing.
 *
 * These are the *leaf cut-outs* (leaves.gen.ts, `npm run leaves:build`), not
 * the catalogue covers: head-on, edge to edge, no wall and no architrave
 * around them. That is exactly what a door flying past the camera needs, and
 * it is the only set of images on the site that has it — a cover photo would
 * bring the showroom floor along with it.
 *
 * ⚠️ Watermarked or unusable leaves are deliberately absent: `room-03`
 * (veneer-designer-door) and `room-20` (laminate-designer-door) carry
 * third-party marks that survive the crop, and `room-31` (laminate-cng-door)
 * is a 480px group shot whose leaf is ~140px across. The tunnel shows a door
 * at well over full-screen size, so anything soft or marked shows badly here.
 */
const TUNNEL_IDS = [
  'burma-teak-door',
  'architect-teak-door',
  'veneer-cng-door',
  'microcoat-door',
  'wpc-cnc-door',
]
/* A phone gets three, not five, and the three are chosen partly by weight.
   These are hero-critical images — a door cannot fade in late — so the run IS
   the payload: the five desktop leaves are 131 kB, and this teak → painted →
   WPC run is 60 kB against the 46 kB the portal hero's two photographs cost.
   Solid teak still leads, because it is the thing the business is known for. */
const TUNNEL_IDS_MOBILE = ['burma-teak-door', 'microcoat-door', 'wpc-cnc-door']

/**
 * One door in the tunnel. The <img> never changes, so it is memoised away from
 * the per-frame transform on its wrapper — same reason WorldCardInner is
 * memoised in the corridor.
 */
const TunnelLeaf = memo(function TunnelLeaf({ id }: { id: string }) {
  const leaf = LEAF_IMAGES[id]
  /* Low, deliberately: none of these is needed until the tunnel is moving, and
     on a saturated link every byte fetched now is a byte the headline and the
     first door are waiting behind. */
  return (
    <img src={leaf.src} alt="" width={leaf.w} height={leaf.h} draggable={false} fetchPriority="low" decoding="async" />
  )
})

function TunnelDoor({
  id,
  z,
  first,
  dx,
  dy,
  glow,
  near,
}: {
  id: string
  z: number
  first: boolean
  dx: number
  dy: number
  /** z at which this door is fully gone — see NEAR / NEAR_MOBILE */
  near: number
  /** how bright the room behind the leaf is — dimmed as the corridor takes
      over, so the last doors open onto the four worlds and not onto a blob */
  glow: number
}) {
  const leaf = LEAF_IMAGES[id]
  /* Opens on approach, so you are always flying through an opening rather than
     at a closed slab — but late, and only to 72°.
     ⚠️ Both numbers matter more than they look. Opening early (from z −2600)
     meant the door was never seen as a door: by the time it was big enough to
     look at, it was already edge-on and reading as a plank. And past ~80° a
     leaf hinged at its left edge presents almost nothing but its thickness to
     the camera, so the photograph — the entire point of using real doors —
     stops being visible exactly when it is closest. Closed and growing, then a
     late fast swing, then gone. */
  const fog = clamp01((z - FOG_IN) / (FOG_FULL - FOG_IN))
  const gone = 1 - clamp01((z - (near - 220)) / 220)
  const hidden = fog * gone <= 0.002

  /* A door that cannot be seen is parked rather than merely made transparent,
     and the values that can be are rounded. React diffs inline styles and skips
     a property whose value has not changed, so a constant style for an
     invisible door writes nothing, and a shade whose opacity is quantised to
     1/50 writes on a handful of frames instead of all of them.
     ⚠️ Worth being honest about: measured at 4× CPU throttle, this pair bought
     nothing detectable on its own. The hero's style-recalc cost turned out to
     be almost entirely one custom property set on the wall's wrapper — see the
     note at `headOpacity`'s call site in DoorWall. Keep this anyway (writing
     styles for elements nobody can see is still wrong), but do not go hunting
     here first if the hero ever gets slow again. */
  const open = hidden ? 0 : easeOutCubic(clamp01((z + 1000) / 1100))
  const opacity = hidden ? 0 : Math.round(fog * gone * 100) / 100
  return (
    <div
      className="ktun__door"
      style={{
        '--kt-ar': leaf.w / leaf.h,
        transform: hidden
          ? 'translate(-50%, -50%) translate3d(0px, 0px, -9999px)'
          : `translate(-50%, -50%) translate3d(${dx}px, ${dy}px, ${z.toFixed(0)}px)`,
        opacity,
        visibility: hidden ? 'hidden' : 'visible',
      } as React.CSSProperties}
    >
      {/* the lit room the leaf swings away from */}
      <span className="ktun__gap" style={{ opacity: Math.round(open * glow * 50) / 50 }} />
      {/* ⚠️ The jamb is behind the leaf, and that ordering is the same scar
          .door-scene__frame carries: its inset + equal border occupy exactly
          the ring outside the opening, so closed it abuts the leaf either way —
          but the leaf swings toward the camera and perspective makes its near
          edge overhang the opening. In front, the architrave paints over that
          overhang and an open door reads as tucked behind its own frame. */}
      <span className="ktun__jamb" />
      <div className="ktun__leaf" style={{ transform: `rotateY(${(-open * 72).toFixed(1)}deg)` }}>
        {/* The first door is what you see through the keyhole before anything
            has moved, so it is the one that must not arrive late. */}
        {first ? <FirstLeaf id={id} /> : <TunnelLeaf id={id} />}
        {/* edge shade as it turns away from the light, exactly as .pdoor__shade */}
        <span className="ktun__shade" style={{ opacity: Math.round(open * 40) / 50 }} />
      </div>
    </div>
  )
}

const FirstLeaf = memo(function FirstLeaf({ id }: { id: string }) {
  const leaf = LEAF_IMAGES[id]
  return (
    <img src={leaf.src} alt="" width={leaf.w} height={leaf.h} draggable={false} fetchPriority="high" decoding="async" />
  )
})

/**
 * The keyhole itself: an opaque plate with a keyhole cut out of it, over the
 * whole viewport.
 *
 * ⚠️ It opens by shrinking its own **viewBox**, never by CSS-scaling the
 * element. A `transform: scale()` on a composited layer rasterises once and
 * then stretches those pixels, so by the time the hole is 14× up the edge of
 * the cut is visibly soft and stepped — on the one shape the whole opening
 * shot is made of. Re-projecting the viewBox re-renders the path at the new
 * size instead, so the edge stays a vector edge the whole way out.
 *
 * The plate and the hole are one path with `fill-rule="evenodd"`: a point
 * inside the plate crosses one edge and fills, a point inside the keyhole
 * crosses two and does not. The hole has to be a **single non-overlapping
 * subpath** for that to hold — a circle subpath plus an overlapping trapezoid
 * subpath gives three crossings in the overlap and paints a solid blob across
 * the middle of the keyhole.
 */
const EYE = { x: 50, y: 40, r: 17 }
/* where the slot's sides meet the circle: x = 50 ± 6.5 puts y at 40 + √(17²−6.5²) */
const KEYHOLE_PATH =
  'M -400 -400 H 400 V 400 H -400 Z ' +
  'M 43.5 55.71 A 17 17 0 1 1 56.5 55.71 L 63.5 92 L 36.5 92 Z'

function Keyhole({ s, box }: { s: number; box: number }) {
  /* 1 → the plate fills the screen with a small keyhole in it; at the far end
     the window is entirely inside the circle, so there is no plate left to
     draw and the whole overlay unmounts. */
  const zoom = 1 + easeInQuad(s) * (box / 14 - 1)
  const w = box / zoom
  /* At rest the keyhole sits in the lower half so the headline keeps the top
     of the screen, exactly as the portal hero's copy-over-door layout does.
     But the window has to finish centred *on* the eye or the last frames swing
     the plate back into shot, so the centre drifts from one to the other. */
  const cy = EYE.y - (1 - easeInQuad(s)) * 4
  return (
    <svg
      className="keyhole"
      viewBox={`${(EYE.x - w / 2).toFixed(2)} ${(cy - w / 2).toFixed(2)} ${w.toFixed(2)} ${w.toFixed(2)}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path d={KEYHOLE_PATH} fillRule="evenodd" />
    </svg>
  )
}

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

export function HeroKeyhole() {
  const trackRef = useRef<HTMLElement>(null)
  const p = useTrackProgress(trackRef)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const mobile = useMediaQuery('(max-width: 720px)')
  const beamsWanted = useDecorativeChunk()
  /* Same hysteresis gate as the portal hero, and for the same reason: hiding
     the canvas does not stop @react-three/fiber's render loop, and leaving it
     running costs ~120 WebGL draw calls/sec for the life of the home page. The
     beams here are the light behind the keyhole, so they go out earlier. */
  const [beamsLive, setBeamsLive] = useState(true)
  useEffect(() => {
    setBeamsLive((live: boolean) => (live ? p < 0.36 : p < 0.26))
  }, [p])
  /* Two gates on the wall, and they are deliberately not the same gate.
     `wallMounted` is the download and the decode: 4 kB of chunk and 28
     photographs, which must be ready before the last door opens onto them, so
     it fires early. `wallLive` is the rAF — 28 transform writes per frame,
     which must NOT be running while the keyhole and the first doors are still
     scrubbing, so it fires late. Mounting early and running late is only
     possible because DriftWall now takes `paused`.
     Hysteresis on both, so scrubbing across an edge cannot thrash a mount. */
  const [wallMounted, setWallMounted] = useState(false)
  const [wallLive, setWallLive] = useState(false)
  useEffect(() => {
    setWallMounted((on: boolean) => (on ? p > 0.16 : p > 0.24))
    setWallLive((on: boolean) => (on ? p > 0.36 : p > 0.44))
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

  const ids = mobile ? TUNNEL_IDS_MOBILE : TUNNEL_IDS
  const n = ids.length
  const near = mobile ? NEAR_MOBILE : NEAR
  const offsetScale = mobile ? OFFSET_SCALE_MOBILE : 1
  const keyhole = seg(p, 0, KEYHOLE_END)
  const copyOpacity = 1 - seg(p, 0.1, 0.2)
  /* Out early: the beams are the light behind the keyhole, and once the tunnel
     has its own lit doorways the two light sources fight — broad gold diagonals
     raked across a corridor read as a second scene laid over the first. */
  const beamsOpacity = 1 - seg(p, 0.15, 0.27)

  /* The whole field slides forward together: door i starts at -(i+1)·SPACING
     and everything advances by one full field length plus BACK. That spaces
     the fly-bys evenly across the phase without each door needing its own
     schedule — door i passes the camera at u = ((i+1)·SPACING + BACK + NEAR)/T. */
  const u = seg(p, TUNNEL[0], TUNNEL[1])
  /* Door i passes the camera at u = ((i+1)·SPACING + BACK + NEAR) / travel, so
     including NEAR here is what keeps the last fly-by off the very end of the
     phase — otherwise the run finishes after the corridor has begun. */
  const travel = (n + 1) * SPACING + BACK + near
  const advance = u * travel

  /* The corridor still runs on the 0.45→0.9 slice it was written for, so it is
     handed a remapped p rather than having its thresholds retuned in two
     places. */
  const hallOpacity = Math.round((1 - seg(p, WALL_IN + 0.04, 0.7)) * 50) / 50
  /* rounded, and read by all five doors — an unrounded value re-renders every
     door on every frame for a light level nobody can see change */
  const glow = Math.round((0.28 + 0.72 * hallOpacity) * 50) / 50
  const wallOpacity = seg(p, WALL_IN, WALL_FULL)
  /* The head lands after the last door has gone past, not with the wall. The
     photographs want to be visible *through* the opening — that is the whole
     point of the handoff — but a headline does not: a door sweeping across
     "THE DOOR WALL" mid-word just looks like two things drawn on top of each
     other. Rounded, and handed to DoorWall as a prop rather than as a custom
     property on .ktwall — see the note at its call site there. */
  const headOpacity = Math.round(seg(p, 0.64, 0.74) * 50) / 50
  const wallInteractive = p > 0.78

  const peek = () => {
    const el = trackRef.current
    if (!el) return
    const top = el.offsetTop
    const total = el.offsetHeight - window.innerHeight
    const target = p < 0.12 ? top + total * KEYHOLE_END : p < 0.55 ? top + total : top
    smoothScrollTo(target)
  }

  return (
    <section className="portal portal--dark portal--keyhole" ref={trackRef}>
      <div className="portal__sticky">
        <div
          className="portal__rays"
          style={{ opacity: beamsOpacity, visibility: beamsOpacity === 0 ? 'hidden' : 'visible' }}
          aria-hidden="true"
        >
          <ErrorBoundary label="beams" fallback={null}>
            <Suspense fallback={null}>
              {beamsWanted && beamsLive && (
                <Beams beamWidth={4} beamHeight={30} beamNumber={12} lightColor="#f2d18a" speed={2} noiseIntensity={1.5} rotation={30} />
              )}
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* ⚠️ preserve-3d subtree: Chrome resolves elementFromPoint (and so
            mouse events) to the wrong element inside one — the DriftWall and
            /try scars. Nothing in here is interactive and the whole layer is
            pointer-events: none, which is what keeps that safe. Do not put a
            link or a button inside the tunnel. */}
        {/* perspective comes from the constant, not from the stylesheet: the
            z values above are only meaningful against it, and a stylesheet
            free to drift from them would silently rescale the whole tunnel. */}
        <div className="ktun" style={{ perspective: `${PERSPECTIVE}px` }} aria-hidden="true">
          {/* The hall is deliberately OUTSIDE .ktun__space. A plain child of a
              preserve-3d parent sits at z = 0, which would paint this vignette
              in front of every door still approaching from negative z.

              It fades on its own schedule because the tunnel now sits above the
              corridor: the doors take themselves off screen as they pass, but
              this vignette would otherwise keep dimming the corridor for the
              whole rest of the page. */}
          <div className="ktun__hall" style={{ opacity: hallOpacity }} />
          <div className="ktun__space">
            {ids.map((id, i) => (
              <TunnelDoor
                key={id}
                id={id}
                first={i === 0}
                dx={OFFSETS[i][0] * offsetScale}
                dy={OFFSETS[i][1] * offsetScale}
                glow={glow}
                near={near}
                z={-(i + 1) * SPACING - BACK + advance}
              />
            ))}
          </div>
        </div>

        {/* `box` is the viewBox side at rest, and it is what sets how big the
            keyhole reads. `slice` maps the viewport's LONG axis to exactly that
            many units — width on a desktop, height on a phone — so the two
            orientations need different numbers to land on the same apparent
            size. 340 puts the keyhole at ~34vh on a 16:9 desktop; 230 puts it
            at ~30vh on a phone. */}
        {keyhole < 1 && <Keyhole s={keyhole} box={mobile ? 210 : 290} />}

        <div className="ktun__copy" style={{ opacity: copyOpacity, pointerEvents: copyOpacity > 0.3 ? 'auto' : 'none' }}>
          <HeroCopy />
        </div>

        {/* After the tunnel and the copy in the document: the wall's "THE DOOR
            WALL" is an <h2> and must not stand ahead of the page's own <h1> in
            the heading outline. Paint order is z-index, so this costs nothing
            visually. */}
        <div
          className="ktwall"
          style={{
            opacity: Math.round(wallOpacity * 100) / 100,
            visibility: wallOpacity === 0 ? 'hidden' : 'visible',
            pointerEvents: wallInteractive ? 'auto' : 'none',
          }}
          /* `inert` rather than a tabIndex sweep: the wall is a whole
             interactive subtree (28 tiles, a viewer, a close button), and while
             the hero is still flying none of it should be reachable by tab or
             announced by a screen reader. pointer-events is the belt to its
             braces. */
          inert={!wallInteractive}
        >
          {/* Decorative-adjacent: a stale chunk after a redeploy should cost the
              landing and nothing else, so this fails to the band's own ground
              rather than to a crash screen under the hero. */}
          <ErrorBoundary label="door-wall" fallback={null}>
            <Suspense fallback={null}>
              {wallMounted && <DoorWall compact paused={!wallLive} headOpacity={headOpacity} />}
            </Suspense>
          </ErrorBoundary>
        </div>

        <button
          type="button"
          className="hero__scrollcue"
          style={{ opacity: copyOpacity, pointerEvents: copyOpacity > 0.3 ? 'auto' : 'none' }}
          onClick={peek}
          tabIndex={copyOpacity > 0.5 ? 0 : -1}
        >
          <span>Scroll — look inside</span>
          <span className="hero__arrow" aria-hidden="true">
            ↓
          </span>
        </button>
      </div>
    </section>
  )
}
