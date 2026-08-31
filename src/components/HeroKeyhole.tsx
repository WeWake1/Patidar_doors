import { Suspense, lazy, memo, useEffect, useRef, useState } from 'react'
import { LEAF_IMAGES } from '../data/leaves.gen'
import { smoothScrollTo } from '../lib/smoothScroll'
import { useIdleAfterLoad } from '../lib/useIdleAfterLoad'
import { useNearViewport } from '../lib/useNearViewport'
import { clamp01, easeOutCubic, seg, useMediaQuery, useTrackProgress } from '../lib/useTrackProgress'
import { ErrorBoundary } from './ErrorBoundary'
import { HeroDoorPhoto } from './HeroDoorPhoto'
import { HeroKicker, WORLD_ARTS, WorldCard } from './heroWorlds'

/* The wall is the hero's landing, so unlike the standalone band it cannot be
   gated on `useNearViewport` — inside a sticky pane it is on screen for the
   whole track. It is gated on progress instead, and mounted paused; see
   `wallMounted` / `wallLive` below. */
const DoorWall = lazy(() => import('./DoorWall').then((m) => ({ default: m.DoorWall })))

/**
 * The locked-door hero: a real door stands close in a dark hall with a brass
 * keyhole on its handle side, and a key in it that keeps nudging itself round
 * (phase A); turn the key — or just scroll — and it swings open and rushes
 * past you, and the doors behind it do the same, each opening as you reach it
 * (phase B); the last one opens onto the Door Wall — every door in the store,
 * drifting — and holds there (phase C).
 *
 * ⚠️ **Phase A was a full-screen keyhole cut-out until 2026-08-31** — an
 * opaque plate over the viewport with a keyhole punched out of it, opening by
 * re-projecting its own viewBox. It was replaced because it had no way in
 * except scroll: the payoff of this hero is the wall three-quarters of a
 * 380vh track away, and a phone visitor who does not keep swiping never
 * reaches it. The lock is that way in, and it is the *same* way in — see
 * `unlock`, which does not animate anything itself. It scrolls the page.
 * So there is exactly one animation here, the scroll one, and the flight a
 * visitor is given is provably the flight a visitor can make by hand.
 *
 * Phase C was the four world cards until 2026-08-23. The wall is the better
 * payoff and it is the one the animation has been promising: a tunnel that
 * spends its whole height on real doors should not hand you four abstract
 * material swatches at the end of it. The worlds move down the page as
 * `WorldsBand`.
 *
 * ⚠️ **No Beams, and none is wanted.** The portal hero puts a WebGL canvas
 * (three + @react-three/fiber + drei, 238 kB gzipped — more than twice the
 * rest of the site) behind its opening phase. This hero drops it outright:
 * the keyhole is a small aperture onto a dark hall, its light comes from
 * `.portal__rays`' gradient and from the lit doorway behind each tunnel door,
 * and a full-screen raked shader competed with both. Removing it takes 238 kB
 * off what a visitor to the home page downloads and a full-screen fragment
 * shader at DPR 3 off the GPU while the hero is scrubbing.
 * Consequently there is no `useDecorativeChunk` gate, no `beamsLive` render-loop
 * gate and no stale-chunk ErrorBoundary here — all three existed to manage that
 * canvas. `three` currently has exactly one importer left (`Beams`, via
 * HeroPortal) and it must stay that way: a second one makes Rollup hoist a
 * vendor chunk. Once the portal hero goes, so do three, @react-three/fiber,
 * drei and `Beams.tsx`.
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
/* The door up front opens in place over this slice, before the field starts
   moving at TUNNEL[0] — so the swing is the answer to the key, and the rush
   forward is a separate beat after it. Overlapping the two by a couple of
   points is deliberate: the door is ~90% open as it starts to move, which is
   what makes it read as being pushed through rather than watched. */
const GATE_OPEN = [0.02, 0.15] as const
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
/* How far in front the *first* door stands at rest — the one with the lock on
   it. 900/(900-(-120)) is 0.88, so it is very nearly life-size in the frame
   and reads as a door you are standing at rather than one down the hall.
   ⚠️ It replaced a `BACK` of 400 that held the whole field back behind the
   keyhole plate, and it is the same number for every door: the gate is field
   index 0, not a separate object in front of the field. That matters. Given
   its own z schedule it moved at its own speed, and since it is the nearest
   thing on screen anything slower than the field behind it lets door 2
   overtake and fly *through* it. One field, one advance, no parallax to get
   wrong. */
const GATE_DEPTH = 120
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
/* ⚠️ `TUNNEL_IDS[0]` is the door up front, the one the lock is drawn on, and
   the order is chosen for it. The architect teak leaf leads because it is the
   only leaf in the set that is a whole door, edge to edge and square on, with
   its own hardware at lock height on the right — so the brass keyhole lands
   under a real handle instead of on bare grain. Burma teak led until
   2026-08-31 and cannot: its crop still carries a slice of jamb down the left,
   which is invisible at 0.4 scale mid-tunnel and unmissable at 0.88 with a
   headline over it. */
const TUNNEL_IDS = [
  'architect-teak-door',
  'burma-teak-door',
  'veneer-cng-door',
  'microcoat-door',
  'wpc-cnc-door',
]
/* A phone gets three, not five, and the three are chosen partly by weight.
   These are hero-critical images — a door cannot fade in late — so the run IS
   the payload: the five desktop leaves are 129 kB, and this teak → painted →
   WPC run is 59 kB against the 46 kB the portal hero's two photographs cost.
   Teak still leads, because it is the thing the business is known for, and on
   a phone as on a desktop the leading leaf is the one wearing the lock. */
const TUNNEL_IDS_MOBILE = ['architect-teak-door', 'microcoat-door', 'wpc-cnc-door']

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
  open: openProp,
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
  /** 0–1, and only the door up front passes it. Every other door in the field
      opens on its own z (below), which is the right rule for a door you are
      catching up with — but the gate is already near at rest and that formula
      would have it standing wide open before anyone has touched the key. It
      opens on *progress* instead, over GATE_OPEN, so the swing is the answer
      to the lock. */
  open?: number
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
  const open = hidden ? 0 : (openProp ?? easeOutCubic(clamp01((z + 1000) / 1100)))
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

/* ── the lock on the door up front ─────────────────────────────────────────
   The keyhole is drawn, not photographed, and it has to be. No leaf in the
   catalogue carries a keyhole big enough or reliably enough placed to be a
   44px target, and a hero that asks you to click a real door's real hardware
   would be asking you to hit a different pixel on every door we ever swap in.
   Brass, because that is the site's accent and this is a teak door.

   ⚠️ It lives in its OWN untransformed layer, never inside `.ktun`. That
   layer is `pointer-events: none` on purpose — Chrome resolves
   `elementFromPoint`, and so mouse events, to the wrong element inside a
   preserve-3d subtree, which is the same scar the DriftWall tile and the /try
   warp surface both carry. So the lock is positioned by repeating the gate's
   own arithmetic (`--kg-scale`, `--kt-h`, `--kt-ar`) in a flat box, and it is
   only ever on screen while the gate is standing still at rest — past a few
   points of progress it is faded and gone, so it never has to track a moving
   3D transform at all. */

/* The key sits IN the lock and nudges itself round every few seconds. A second
   variant — the key sliding in from below, turning, and backing out — was
   built beside it behind `?key=insert` and dropped 2026-08-31: its loop leaves
   the plate reading as a bare keyhole for about a fifth of every cycle, and
   the point of the key is to be there when someone looks. */

/* The keyhole cut, in the plate's own 40×76 viewBox. Same construction as the
   full-screen plate this replaced: circle and tapered slot as ONE
   non-overlapping subpath, because two overlapping subpaths give three
   crossings in the overlap and evenodd paints a blob across the middle of it.
   x = 20 ± 3 is where the slot's sides meet the circle, so y = 26 + √(7²−3²). */
const LOCK_KEYHOLE = 'M 17 32.32 A 7 7 0 1 1 23 32.32 L 25.5 50 L 14.5 50 Z'

const GateLock = memo(function GateLock({ unlocking, onUnlock }: { unlocking: boolean; onUnlock: () => void }) {
  return (
    <button
      type="button"
      className="kgate__lock"
      data-unlocking={unlocking || undefined}
      onClick={onUnlock}
      /* The visible words come first in the accessible name, so a voice
         command for what is written on screen still hits it. */
      aria-label="Turn the key — open the doors and go to the door wall"
    >
      <svg className="kgate__plate" viewBox="0 0 40 76" aria-hidden="true">
        <defs>
          <linearGradient id="kg-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e6c67e" />
            <stop offset="0.42" stopColor="#b98c3f" />
            <stop offset="0.62" stopColor="#f2d18a" />
            <stop offset="1" stopColor="#8a6526" />
          </linearGradient>
          {/* ⚠️ A second, brighter ramp for the key, and it earns its place: the
              key is brass sitting on brass, and at 36px the first version of
              it disappeared into its own escutcheon — the plate read as a bare
              keyhole and the thing that is supposed to be nudging itself was
              invisible. Lighter metal plus the dark outline in the stylesheet
              is what separates the two. */}
          <linearGradient id="kg-key" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbeec6" />
            <stop offset="0.55" stopColor="#e8c87f" />
            <stop offset="1" stopColor="#c39a4c" />
          </linearGradient>
        </defs>
        <rect className="kgate__escutcheon" x="4" y="2" width="32" height="72" rx="16" />
        {/* the hole is a dark shape ON the plate rather than a hole cut THROUGH
            it: behind this plate is a photograph of a door, not the hall, so
            an actual cut-out would show teak where the dark of a keyhole
            belongs. A keyhole is a dark shape either way. */}
        <path className="kgate__hole" d={LOCK_KEYHOLE} />
        {/* The key turns about the hole's centre, which is where its shaft
            enters — a key rotates about its own axis, so on screen the bow
            swings around the point of entry and nothing translates. */}
        <g className="kgate__key">
          <rect x="18.2" y="38" width="3.6" height="16" rx="1.4" />
          <circle className="kgate__bow" cx="20" cy="61" r="7.2" fill="none" strokeWidth="3.4" />
          <rect x="22.8" y="43.5" width="4.6" height="2.8" rx="0.9" />
          <rect x="22.8" y="48.4" width="3.2" height="2.6" rx="0.9" />
        </g>
      </svg>
      <span className="kgate__label">Turn the key</span>
    </button>
  )
})

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

/* Where the lock flies you to. Past WALL_FULL (0.66) and past the head's
   reveal (0.74), inside the dwell where the pane simply holds the wall — so
   you arrive at a wall that is lit, titled and interactive, with track left
   underneath you to scroll on from. */
const LAND = 0.86
/* Long enough that five doors opening and passing is legible, short enough
   that it is a move and not a cutscene. A phone gets less: it has two fewer
   doors to show and a shorter track to cover. */
const FLIGHT_S = 3
const FLIGHT_S_MOBILE = 2.5
/* Eased at both ends — the door has to be seen to swing before anything
   rushes, and the wall has to settle rather than slam.
   ⚠️ Sine, not the cubic this shipped with for an afternoon. The doors pass
   between p 0.22 and 0.60, which is the exact middle of the flight, and a
   cubic spends its time at the ends: measured, all five fly-bys landed inside
   555ms — about nine frames each, which is a flicker rather than a door.
   The same span under sine is 795ms and the ends are still eased. Whatever
   replaces this has to be judged on how long it leaves the MIDDLE, because
   that is where everything worth seeing happens. */
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

export function HeroKeyhole() {
  const trackRef = useRef<HTMLElement>(null)
  const p = useTrackProgress(trackRef)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const mobile = useMediaQuery('(max-width: 720px)')
  /* Two gates on the wall, and they are deliberately not the same gate.

     MOUNTING is the chunk, the ~56 tiles and the first image requests. That is
     one visible hitch wherever it happens during the scrub, so it does not
     happen during the scrub at all: it happens on the first idle callback after
     `load`, when nothing is moving and none of it is on screen yet.
     ⚠️ It was a scroll threshold (p > 0.24) until 2026-08-23 and that is
     precisely what the reported single stutter between the first and second
     door was — measured, the DoorWall chunk plus nine tile requests all fired
     at p ≈ 0.25 and their parse, mount and decode landed over the following
     frames. The progress threshold survives only as the fallback for a page
     that never goes idle, and the mount is never undone.

     RUNNING is the rAF — a transform write per column per frame — and must not
     be happening while the keyhole and the first doors are still scrubbing, so
     it starts late. Mounting early and running late is only possible because
     DriftWall takes `paused`.
     ⚠️ `heroNear` is load-bearing and its absence was a real bug. Progress
     clamps at 1 and STAYS there once the track is behind you, so a gate written
     only on `p` left the wall animating for the rest of the page — measured at
     the very bottom of the document, hero off screen, tiles still moving. That
     is the exact leak `useNearViewport` was written for. */
  const idleReady = useIdleAfterLoad()
  const heroNear = useNearViewport(trackRef)
  const [wallMounted, setWallMounted] = useState(false)
  const [wallRunning, setWallRunning] = useState(false)
  /* Only drives the key's own turn. The flight itself is the page scrolling,
     so it needs no state — `p` is already telling everything on screen where
     it is, whether the scroll came from a wheel or from this button.
     ⚠️ It is cleared on a timer rather than latched, because the key has to be
     turnable **again**. Scroll back up to the door and you are looking at the
     same locked door you started at; a latch left it stuck at −96° with the
     button refusing every further tap, which is the one thing a visitor who
     has just watched the flight is most likely to try. Do not reintroduce an
     `if (unlocking) return` guard — a second tap mid-flight merely re-aims the
     same scroll at the same target, which is harmless. */
  const [unlocking, setUnlocking] = useState(false)
  const relockRef = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(relockRef.current), [])
  useEffect(() => {
    setWallMounted((on: boolean) => on || idleReady || p > 0.24)
    /* ⚠️ 0.42, and the number is chosen to dodge something. Doors pass the
       camera at p ≈ 0.31, 0.39, 0.46, 0.54, 0.62, and starting the loop is a
       step change in per-frame work plus a fresh burst of lazily-loaded tiles
       entering the plane. Started at 0.36 that landed between the first and
       second door — the same window as the mount hitch above, which is not a
       coincidence: both were sitting in the busiest stretch of the scrub.
       0.42 is a gap between fly-bys and is still ahead of WALL_IN (0.46), so
       the wall is already drifting steadily by the time anyone can see it.
       Hysteresis, so scrubbing across the edge cannot thrash the loop. */
    setWallRunning((on: boolean) => (on ? p > 0.36 : p > 0.42))
  }, [p, idleReady])
  const wallLive = wallRunning && heroNear

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
  const copyOpacity = 1 - seg(p, 0.1, 0.2)
  /* The gate swings on progress, not on its z — see TunnelDoor's `open` prop.
     It also opens further than the doors behind it (86° against 72°): those
     are seen for a moment in passing and a leaf past ~80° presents nothing but
     its own thickness, but this one is stood in front of you being opened, and
     a door that stops at 72° with the camera still outside it reads as stuck. */
  const gateOpen = easeOutCubic(seg(p, GATE_OPEN[0], GATE_OPEN[1]))
  /* The lock is only on screen while the gate is standing still. It goes the
     moment anything moves — a brass plate pinned to a flat layer while the
     door it is drawn on rushes forward would slide straight off it. */
  const lockOpacity = Math.round((1 - seg(p, 0.005, 0.05)) * 100) / 100
  /* Out early: this is the light behind the keyhole, and once the tunnel has
     its own lit doorways the two light sources fight — broad gold diagonals
     raked across a corridor read as a second scene laid over the first. */
  const raysOpacity = Math.round((1 - seg(p, 0.15, 0.27)) * 100) / 100

  /* The whole field slides forward together: door i starts at -(i+1)·SPACING
     and everything advances by one full field length plus BACK. That spaces
     the fly-bys evenly across the phase without each door needing its own
     schedule — door i passes the camera at u = ((i+1)·SPACING + BACK + NEAR)/T. */
  const u = seg(p, TUNNEL[0], TUNNEL[1])
  /* Door i passes the camera at u = ((i+1)·SPACING + BACK + NEAR) / travel, so
     including NEAR here is what keeps the last fly-by off the very end of the
     phase — otherwise the run finishes after the corridor has begun. */
  const travel = n * SPACING + GATE_DEPTH + near
  const advance = u * travel
  /* 900/(900 − z) is the projection, so this is exactly how big the gate is
     drawn at rest — the lock layer repeats it to sit on the right pixels. */
  const gateScale = PERSPECTIVE / (PERSPECTIVE + GATE_DEPTH)

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
    const target = p < 0.12 ? top + total * 0.3 : p < 0.55 ? top + total : top
    smoothScrollTo(target)
  }

  /**
   * Turn the key. ⚠️ This animates nothing: it scrolls the page to where the
   * wall is, and every door on screen follows because every door on screen is
   * already a function of scroll. That is the whole design of it — there is
   * one flight, the scrolled one, and the button is a way of asking for it
   * rather than a second implementation of it. It also means the visitor lands
   * with the page's real scroll position under them: they can scroll back up
   * and watch it again, and the sticky releases where it always did.
   */
  const unlock = () => {
    const el = trackRef.current
    if (!el) return
    setUnlocking(true)
    window.clearTimeout(relockRef.current)
    relockRef.current = window.setTimeout(
      () => setUnlocking(false),
      (mobile ? FLIGHT_S_MOBILE : FLIGHT_S) * 1000 + 400,
    )
    /* ⚠️ The wall normally mounts on the first idle callback after `load` —
       early, precisely so its chunk and its ~56 tiles never land during a
       scrub. A visitor who turns the key before that has happened would fly
       three seconds into an empty pane, so the flight forces the mount. */
    setWallMounted(true)
    const top = el.offsetTop
    const total = el.offsetHeight - window.innerHeight
    smoothScrollTo(top + total * LAND, {
      duration: mobile ? FLIGHT_S_MOBILE : FLIGHT_S,
      easing: easeInOutSine,
    })
  }

  return (
    <section className="portal portal--dark portal--keyhole" ref={trackRef}>
      <div className="portal__sticky">
        {/* ⚠️ The light behind the keyhole is this CSS gradient and NOTHING
            else. There is deliberately no WebGL Beams canvas here — see the
            note above the component. `.portal__rays` was written as a
            stand-in drawn to look like the canvas that would replace it; in
            this hero it is not standing in for anything, it is the backdrop.
            So its "retune both or neither" pairing with the shader no longer
            binds here, and it can be tuned on its own — but the portal hero
            still uses it with the canvas over the top, so a change made for
            this hero has to be checked there too until that hero is deleted. */}
        <div
          className="portal__rays"
          style={{ opacity: raysOpacity, visibility: raysOpacity === 0 ? 'hidden' : 'visible' }}
          aria-hidden="true"
        />

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
                open={i === 0 ? gateOpen : undefined}
                z={-i * SPACING - GATE_DEPTH + advance}
              />
            ))}
          </div>
        </div>

        {/* The lock, in a flat layer over the door up front. Sized off the same
            three numbers the gate is drawn from, so it lands on the leaf's
            handle side whatever the viewport does to the door. Unmounted the
            moment it is invisible — it is a button, and a transparent button
            over the middle of the screen would still swallow a click. */}
        {lockOpacity > 0 && (
          <div
            className="kgate"
            style={
              {
                opacity: lockOpacity,
                '--kg-scale': gateScale.toFixed(3),
                '--kt-ar': LEAF_IMAGES[ids[0]].w / LEAF_IMAGES[ids[0]].h,
              } as React.CSSProperties
            }
          >
            <GateLock unlocking={unlocking} onUnlock={unlock} />
          </div>
        )}

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

        {/* Quieter than it was, and kept. The key is the loud invitation, but a
            visitor who ignores it and starts scrolling must not be left
            wondering whether scrolling does anything — and the two prompts at
            equal weight read as two different offers rather than one. */}
        <button
          type="button"
          className="hero__scrollcue hero__scrollcue--quiet"
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
