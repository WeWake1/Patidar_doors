import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from 'react'
import { LEAF_IMAGES } from '../data/leaves.gen'
import {
  GATE_DEPTH,
  OFFSETS,
  OPEN_DEG,
  PERSPECTIVE,
  TUNNEL_IDS,
  WALL_IN,
  copyOpacity,
  doorOpacity,
  doorOpen,
  doorZ,
  fieldFor,
  gateOpen,
  glowAt,
  hallOpacity,
  lockOpacity,
  projectedScale,
  raysOpacity,
  wallOpacity,
} from '../lib/heroTunnel'
import { smoothScrollTo } from '../lib/smoothScroll'
import { createTunnelRenderer } from '../lib/tunnelCanvas'
import type { TunnelDoor, TunnelRenderer } from '../lib/tunnelCanvas'
import { useIdleAfterLoad } from '../lib/useIdleAfterLoad'
import { useNearViewport } from '../lib/useNearViewport'
import { clamp01, easeInOutSine, useMediaQuery } from '../lib/useTrackProgress'
import { ErrorBoundary } from './ErrorBoundary'
import { HeroDoorPhoto } from './HeroDoorPhoto'
import { HeroKicker, WORLD_ARTS, WorldCard } from './heroWorlds'

/* The wall is the hero's landing, so unlike the standalone band it cannot be
   gated on `useNearViewport` — inside a sticky pane it is on screen for the
   whole track. It is gated on progress instead, and mounted paused; see
   `wallWanted` / `wallLive` below. */
const DoorWall = lazy(() => import('./DoorWall').then((m) => ({ default: m.DoorWall })))

/**
 * The locked-door hero: a real door stands close in a dark hall with a brass
 * keyhole on its handle side, and a key in it that keeps nudging itself round
 * (phase A); turn the key — or just scroll — and it swings open and rushes
 * past you, and the doors behind it do the same, each opening as you reach it
 * (phase B); the last one opens onto the Door Wall — every door in the store,
 * drifting — and holds there (phase C).
 *
 * ⚠️⚠️ **HOW IT IS DRAWN, and why it must stay this way (2026-11-11).**
 * The whole tunnel is ONE `<canvas>` (`tunnelCanvas.ts`, hand-written WebGL),
 * redrawn from the scroll position by a plain listener. There are no door
 * elements, no CSS 3D, no scroll-timeline stylesheet, and **React does not
 * render during the scrub at all** — the component re-renders only when a
 * discrete `Phase` flag flips (the lock unmounts, the wall becomes clickable),
 * about eight times across the whole track.
 *
 * It replaced three months of DOM tunnels that each measured clean in headless
 * Chrome and each broke on real phones (doors drawn in chunks, strips missing,
 * stutter that got worse on the way back up). The account is at the top of
 * `tunnelCanvas.ts`; the short version is that a door which grows 30× on its
 * way past the camera is the worst thing you can hand a browser's compositor,
 * and a canvas is one screen-sized layer whatever is drawn in it.
 *  · Do not put a per-frame value back into React state. `useTrackProgress`
 *    (a `setState` per scroll event) is how this component used to re-render —
 *    and diff the 56-tile wall under it — sixty times a second.
 *  · Do not rebuild any of this as elements "for one small thing". The lock is
 *    the only DOM over the tunnel and it is there because it is a button.
 *
 * ⚠️ **The lock animates nothing.** See `unlock`: it scrolls the page, and the
 * doors follow because they are a function of scroll. So there is exactly one
 * flight, the scrolled one, and a visitor lands with a real scroll position
 * under them — they can scroll back up and watch it again.
 *
 * Phase C was the four world cards until 2026-08-23. The wall is the better
 * payoff and it is the one the animation has been promising: a tunnel that
 * spends its whole height on real doors should not hand you four abstract
 * material swatches at the end of it. The worlds move down the page as
 * `WorldsBand`.
 *
 * ⚠️ **No three.js here, and none is wanted.** The portal hero (`?hero=old`)
 * puts a Beams canvas — three + @react-three/fiber + drei, 238 kB gzipped —
 * behind its opening phase. This hero's WebGL is ~3 kB of our own, and `three`
 * must keep exactly one importer (`Beams`, via HeroPortal): a second one makes
 * Rollup hoist a vendor chunk. `verify:e2e` asserts no such chunk is fetched.
 */

/* ── the geometry, in world px in front of a perspective of 900 ─────────────
   A door's on-screen size is 900/(900 − z), so z = 0 is life-size and z
   approaching +900 is the camera itself. The numbers live in `heroTunnel.ts`;
   what they mean:

   GATE_DEPTH — how far in front the *first* door stands at rest, the one with
   the lock on it. 900/(900+120) is 0.88, so it is very nearly life-size in the
   frame and reads as a door you are standing at rather than one down the hall.
   ⚠️ The gate is field index 0, not a separate object in front of the field.
   Given its own z schedule it moved at its own speed, and since it is the
   nearest thing on screen anything slower than the field behind it lets door 2
   overtake and fly *through* it. One field, one advance.

   NEAR — where a door is cut, and the single number that decides whether this
   reads as flying *through* doors or watching them from a seat. 900/(900−700)
   is 4.5×, so a leaf ends up around three screens tall and genuinely engulfs
   the camera on the way past. The first cut of this was 380 (1.7×), and every
   door politely faded out at about the size it had been all along.
   ⚠️ A phone cuts the pass much earlier (NEAR_MOBILE). A door is about 0.42 as
   wide as it is tall, so on a portrait screen it reaches the full width long
   after it has overflowed top and bottom — at 4.5× all that is left on a 390px
   viewport is the inside of the jamb. 2.6× is as close as a phone can come and
   still be looking at a door.

   OFFSETS — doors do not all fly through the exact centre of the screen: far
   enough off-axis to feel like travel, near enough that the hall still reads
   as one you are walking straight down. Scaled in on a phone, which has no
   width to spare.

   TUNNEL_IDS — real doors, in the order you fly through them. They are the
   *leaf cut-outs* (leaves.gen.ts), not the catalogue covers: head-on, edge to
   edge, no wall and no architrave. ⚠️ `TUNNEL_IDS[0]` is the door the lock is
   drawn on, and the order is chosen for it: the architect teak leaf is the one
   leaf that is a whole door, square on, with real hardware at lock height.
   Watermarked or soft leaves are deliberately absent (`room-03`, `room-20`,
   `room-31`): the tunnel shows a door at well over full-screen size. */

/** `--night`, the opening a leaf hangs in (global.css). */
const JAMB_RGB = [0x24, 0x1c, 0x13] as const

/* ── what React is told ────────────────────────────────────────────────────
   Everything that moves every frame is written straight to the canvas or to
   an element's style by the scroll loop. These are the things that are *state*
   — mounted or not, clickable or not — and are fine a frame late. */
interface Phase {
  /** the lock is on screen (and so mounted — it is a button) */
  lock: boolean
  /** the headline and the scroll cue can be read, so they can be clicked */
  copyLive: boolean
  /** latched: the wall's chunk and tiles are wanted in the DOM */
  wallWanted: boolean
  /** the wall's own drift loop may run */
  wallRunning: boolean
  /** far enough from its fade that its layers can be handed back */
  wallParked: boolean
  wallInteractive: boolean
  /** the wall's headline has arrived */
  headShown: boolean
}

const REST: Phase = {
  lock: true,
  copyLive: true,
  wallWanted: false,
  wallRunning: false,
  wallParked: true,
  wallInteractive: false,
  headShown: false,
}

function phaseAt(p: number, prev: Phase): Phase {
  return {
    /* The lock is only on screen while the gate is standing still. It goes the
       moment anything moves — a brass plate pinned to a flat layer while the
       door it is drawn on rushes forward would slide straight off it. */
    lock: lockOpacity(p) > 0,
    copyLive: copyOpacity(p) > 0.4,
    /* The wall normally mounts on the first idle callback after `load` — off
       the scrub entirely, because mounting it is a chunk, ~56 tiles and the
       first image requests, and wherever that lands during the flight is one
       visible hitch. This threshold is only the fallback for a page that
       never goes idle. Never undone. */
    wallWanted: prev.wallWanted || p > 0.24,
    /* ⚠️ 0.42, chosen to dodge something: doors pass the camera at p ≈ 0.31,
       0.39, 0.46, 0.54, 0.62, and starting the wall's loop is a step change in
       per-frame work plus a burst of lazily-loaded tiles. 0.42 is a gap
       between fly-bys and still ahead of WALL_IN, so the wall is already
       drifting by the time anyone can see it. Hysteresis, so scrubbing across
       the edge cannot thrash the loop. */
    wallRunning: prev.wallRunning ? p > 0.36 : p > 0.42,
    /* ⚠️ Parked well BEFORE the fade starts, not a hair before it — this flag
       drives `content-visibility`, and un-parking lays the subtree out again.
       0.12 of progress is ~250px of scroll on a phone: it is settled long
       before anyone can see it. */
    wallParked: p < WALL_IN - 0.12,
    wallInteractive: p > 0.78,
    /* The head lands after the last door has gone past (~0.62), not with the
       wall. The photographs want to be visible *through* the opening, but a
       headline does not: a door sweeping across "THE DOOR WALL" mid-word just
       looks like two things drawn on top of each other. */
    headShown: prev.headShown ? p > 0.6 : p >= 0.66,
  }
}

function samePhase(a: Phase, b: Phase): boolean {
  return (
    a.lock === b.lock &&
    a.copyLive === b.copyLive &&
    a.wallWanted === b.wallWanted &&
    a.wallRunning === b.wallRunning &&
    a.wallParked === b.wallParked &&
    a.wallInteractive === b.wallInteractive &&
    a.headShown === b.headShown
  )
}

/** What `verify:e2e` reads off the canvas — it has no DOM to ask instead. */
export interface TunnelProbe {
  /** this frame's doors, nearest last; `src` is the photograph each one shows */
  doors: readonly (TunnelDoor & { src: string })[]
  frames: number
  live: () => boolean
  coverage: () => number
}

/* ── the lock on the door up front ─────────────────────────────────────────
   The keyhole is drawn, not photographed, and it has to be. No leaf in the
   catalogue carries a keyhole big enough or reliably enough placed to be a
   44px target, and a hero that asks you to click a real door's real hardware
   would be asking you to hit a different pixel on every door we ever swap in.
   Brass, because that is the site's accent and this is a teak door.

   It is a flat DOM layer over the canvas, positioned by repeating the gate's
   own arithmetic (`--kg-scale`, `--kt-h`, `--kt-ar`), and it is only ever on
   screen while the gate is standing still at rest — past a few points of
   progress it is faded and unmounted, so it never has to track a moving door. */

/* The keyhole cut, in the plate's own 40×76 viewBox: circle and tapered slot
   as ONE non-overlapping subpath, because two overlapping subpaths give three
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
              it disappeared into its own escutcheon. Lighter metal plus the
              dark outline in the stylesheet is what separates the two. */}
          <linearGradient id="kg-key" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fbeec6" />
            <stop offset="0.55" stopColor="#e8c87f" />
            <stop offset="1" stopColor="#c39a4c" />
          </linearGradient>
        </defs>
        <rect className="kgate__escutcheon" x="4" y="2" width="32" height="72" rx="16" />
        {/* the hole is a dark shape ON the plate rather than a hole cut THROUGH
            it: behind this plate is a photograph of a door, not the hall. */}
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

/** The hero with nothing moving: reduced motion, or a browser with no WebGL. */
function StaticHero() {
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

/* Where the lock flies you to. Past WALL_FULL (0.66) and past the head's
   reveal, inside the dwell where the pane simply holds the wall — so you
   arrive at a wall that is lit, titled and interactive, with track left
   underneath you to scroll on from. */
const LAND = 0.86
/* Long enough that five doors opening and passing is legible, short enough
   that it is a move and not a cutscene. One number for both breakpoints: the
   flight is a duration, not a distance.
   ⚠️ Eased with `easeInOutSine`, not a cubic. The doors pass between p 0.22
   and 0.60, the exact middle of the flight, and a cubic spends its time at the
   ends: measured, all five fly-bys landed inside 555ms. Whatever replaces this
   has to be judged on how long it leaves the MIDDLE. */
const FLIGHT_S = 3

/** Opacity is written to two decimals and only when it has changed. */
function fade(el: HTMLElement | null, cache: Record<string, number>, key: string, value: number, hide = false) {
  const v = Math.round(value * 100) / 100
  if (!el || cache[key] === v) return
  cache[key] = v
  el.style.opacity = String(v)
  /* a layer at opacity 0 is still a full-screen layer to blend; this is not */
  if (hide) el.style.visibility = v === 0 ? 'hidden' : 'visible'
}

export function HeroKeyhole() {
  const trackRef = useRef<HTMLElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rulerRef = useRef<HTMLElement>(null)
  const raysRef = useRef<HTMLDivElement>(null)
  const hallRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const cueRef = useRef<HTMLButtonElement>(null)
  const wallRef = useRef<HTMLDivElement>(null)
  const lockRef = useRef<HTMLDivElement | null>(null)
  /** where the page is in the track — a ref, never state (see the header) */
  const pRef = useRef(0)
  const phaseRef = useRef<Phase>(REST)
  const [phase, setPhase] = useState<Phase>(REST)

  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const mobile = useMediaQuery('(max-width: 720px)')
  /* No WebGL at all (a blocklisted GPU, a locked-down webview): the static
     hero is complete without it, so that is what such a visitor gets — never
     an empty hall with a headline over it. */
  const [noCanvas, setNoCanvas] = useState(false)
  const still = reduced || noCanvas

  /* Two gates on the wall, and they are deliberately not the same gate.
     MOUNTING is the chunk, the ~56 tiles and the first image requests: it
     happens on the first idle callback after `load`, when nothing is moving.
     RUNNING is its rAF and must not be going while the first doors are still
     passing, so it starts late — possible only because DriftWall takes
     `paused`.
     ⚠️ `heroNear` is load-bearing. Progress clamps at 1 and STAYS there once
     the track is behind you, so a gate written only on `p` left the wall
     animating for the rest of the page. */
  const idleReady = useIdleAfterLoad()
  const heroNear = useNearViewport(trackRef)
  const wallMounted = phase.wallWanted || idleReady
  const wallLive = phase.wallRunning && heroNear

  /* Only drives the key's own turn — the flight itself is the page scrolling.
     ⚠️ Cleared on a timer rather than latched, because the key has to be
     turnable **again**: scroll back up and you are looking at the same locked
     door. Do not reintroduce an `if (unlocking) return` guard — a second tap
     mid-flight merely re-aims the same scroll at the same target. */
  const [unlocking, setUnlocking] = useState(false)
  const relockRef = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(relockRef.current), [])

  /* ── the scroll loop ─────────────────────────────────────────────────────
     One listener, one rAF, no React. A scroll event and the rAF it requests
     run in the same frame (scroll events are dispatched ahead of animation
     callbacks), so the canvas is never more than the frame it is drawn in
     behind the page — and the pane is sticky, so there is no seam for even
     that to show against. */
  useEffect(() => {
    if (still) return
    const track = trackRef.current
    const pane = paneRef.current
    const canvas = canvasRef.current
    const ruler = rulerRef.current
    if (!track || !pane || !canvas || !ruler) return

    const field = fieldFor(mobile)
    let raf = 0
    let dirty = true
    const invalidate = () => {
      dirty = true
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const renderer: TunnelRenderer | null = createTunnelRenderer(canvas, {
      jamb: JAMB_RGB,
      perspective: PERSPECTIVE,
      openDeg: OPEN_DEG,
      invalidate,
    })
    if (!renderer) {
      setNoCanvas(true)
      return
    }

    /* The photographs. Only the leading leaf is `high`: it is the door on
       screen at rest, and on a saturated link every byte fetched now is a
       byte the headline is waiting behind. None of the others is needed until
       the tunnel is moving. */
    const images = field.ids.map((id, i) => {
      const img = new Image()
      img.decoding = 'async'
      img.fetchPriority = i === 0 ? 'high' : 'low'
      img.onload = () => renderer.setImage(i, img)
      img.src = LEAF_IMAGES[id].src
      return img
    })

    /* One object per door, reused every frame. Far → near is the paint order:
       the field never overtakes itself, so a fixed order is always right. */
    const doors = field.ids.map((id, i) => ({
      tex: i,
      src: LEAF_IMAGES[id].src,
      cx: 0,
      cy: 0,
      scale: 1,
      w: 0,
      h: 0,
      opacity: 0,
      open: 0,
      glow: 0,
    }))
    const paintOrder = [...doors].reverse()
    const probe: TunnelProbe = {
      doors,
      frames: 0,
      live: () => renderer.isLive(),
      coverage: () => renderer.coverage(),
    }
    ;(canvas as HTMLCanvasElement & { __kt?: TunnelProbe }).__kt = probe

    /* Layout, read only when it can have changed. `span` is the scroll the
       sticky pane is pinned for: the track is `Nvh + 100dvh` tall and the pane
       is `100dvh`, so this is a constant `Nvh` whatever a phone's URL bar is
       doing — which is what keeps a door from jumping when the bar retracts. */
    let paneW = 0
    let paneH = 0
    let doorH = 0
    let span = 1
    const measure = () => {
      paneW = pane.clientWidth
      paneH = pane.clientHeight
      doorH = ruler.offsetHeight
      span = Math.max(1, track.offsetHeight - paneH)
      renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio)
      invalidate()
    }

    const shown: Record<string, number> = {}
    let lastP = -1

    function frame(now: number) {
      raf = 0
      const p = clamp01(-track!.getBoundingClientRect().top / span)
      /* every scroll event on the page lands here, including the thousands
         that happen below the hero with p pinned at 1 */
      if (p === lastP && !dirty) return
      lastP = p
      dirty = false
      pRef.current = p

      const next = phaseAt(p, phaseRef.current)
      if (!samePhase(next, phaseRef.current)) {
        phaseRef.current = next
        setPhase(next)
      }

      /* the chrome: six opacities */
      const copy = copyOpacity(p)
      fade(raysRef.current, shown, 'rays', raysOpacity(p), true)
      fade(hallRef.current, shown, 'hall', hallOpacity(p), true)
      /* ⚠️ not `hide` for these two: `visibility: hidden` would take the
         page's <h1> out of the accessibility tree whenever it is scrolled past */
      fade(copyRef.current, shown, 'copy', copy)
      fade(cueRef.current, shown, 'cue', copy)
      fade(wallRef.current, shown, 'wall', wallOpacity(p))
      fade(lockRef.current, shown, 'lock', lockOpacity(p))

      /* the doors */
      const glow = glowAt(p)
      let visible = 0
      for (let i = 0; i < doors.length; i++) {
        const d = doors[i]
        const z = doorZ(i, p, field.near, doors.length)
        const opacity = doorOpacity(z, field.near)
        d.opacity = opacity
        if (opacity <= 0.002) continue
        visible++
        const leaf = LEAF_IMAGES[field.ids[i]]
        const s = projectedScale(z)
        d.scale = s
        d.h = doorH
        d.w = (doorH * leaf.w) / leaf.h
        d.cx = paneW / 2 + OFFSETS[i][0] * field.offsetScale * s
        d.cy = paneH / 2 + OFFSETS[i][1] * field.offsetScale * s
        /* The gate opens on *progress*, every other door on its own approach:
           the gate is already near at rest, and the approach rule would have
           it standing wide open before anyone has touched the key. */
        d.open = i === 0 ? gateOpen(p) : doorOpen(z, field.near)
        d.glow = glow
      }
      /* Once the last door has gone the canvas is an empty full-screen layer
         over the wall; take it out of the compositor's hands until needed. */
      const show = visible > 0 ? 1 : 0
      if (shown.canvas !== show) {
        shown.canvas = show
        canvas!.style.visibility = show ? 'visible' : 'hidden'
      }
      probe.frames++
      if (renderer!.draw(paintOrder, now)) invalidate()
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(pane)
    ro?.observe(canvas)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      ro?.disconnect()
      cancelAnimationFrame(raf)
      raf = 0
      for (const img of images) img.onload = null
      renderer.destroy()
    }
  }, [still, mobile])

  const peek = () => {
    const el = trackRef.current
    const pane = paneRef.current
    if (!el || !pane) return
    const p = pRef.current
    const top = el.offsetTop
    const total = el.offsetHeight - pane.clientHeight
    smoothScrollTo(p < 0.12 ? top + total * 0.3 : p < 0.55 ? top + total : top)
  }

  /**
   * Turn the key. ⚠️ This animates nothing: it scrolls the page to where the
   * wall is, and every door on screen follows because every door on screen is
   * already a function of scroll. There is one flight, the scrolled one, and
   * the button is a way of asking for it rather than a second implementation
   * of it. `verify:e2e` asserts the scroll position actually moved.
   */
  const unlock = useCallback(() => {
    const el = trackRef.current
    const pane = paneRef.current
    if (!el || !pane) return
    setUnlocking(true)
    window.clearTimeout(relockRef.current)
    relockRef.current = window.setTimeout(() => setUnlocking(false), FLIGHT_S * 1000 + 400)
    /* ⚠️ A visitor who turns the key before the wall's idle mount has happened
       would fly three seconds into an empty pane, so the flight forces it. */
    if (!phaseRef.current.wallWanted) {
      phaseRef.current = { ...phaseRef.current, wallWanted: true }
      setPhase(phaseRef.current)
    }
    smoothScrollTo(el.offsetTop + (el.offsetHeight - pane.clientHeight) * LAND, {
      duration: FLIGHT_S,
      easing: easeInOutSine,
    })
  }, [])

  /* The lock unmounts and remounts as the visitor scrubs across p ≈ 0.05, and
     a fresh element has no inline opacity — so it is given the right one as
     it mounts rather than flashing at full strength for a frame. */
  const setLock = useCallback((el: HTMLDivElement | null) => {
    lockRef.current = el
    if (el) el.style.opacity = String(Math.round(lockOpacity(pRef.current) * 100) / 100)
  }, [])

  if (still) return <StaticHero />

  /* 900/(900 − z) is the projection, so this is exactly how big the gate is
     drawn at rest — the lock layer repeats it to sit on the right pixels. */
  const gateScale = projectedScale(-GATE_DEPTH)
  const gateLeaf = LEAF_IMAGES[TUNNEL_IDS[0]]

  return (
    <section className="portal portal--dark portal--keyhole" ref={trackRef}>
      <div className="portal__sticky" ref={paneRef}>
        {/* The light behind the door up front: a CSS gradient and nothing else
            (the portal hero puts a WebGL Beams canvas over it; this one never
            does). */}
        <div className="portal__rays" ref={raysRef} aria-hidden="true" />

        {/* The tunnel. One canvas; the hall is the vignette behind it, and the
            ruler is how the canvas learns `--kt-h` — the door's height is
            owned by the stylesheet (the lock is sized from it too), so the
            renderer measures it rather than restating it. */}
        <div className="ktun" aria-hidden="true">
          <div className="ktun__hall" ref={hallRef} />
          <canvas className="ktun__canvas" ref={canvasRef} />
          <i className="ktun__ruler" ref={rulerRef} />
        </div>

        {/* The lock, in a flat layer over the door up front. Unmounted the
            moment it is invisible — it is a button, and a transparent button
            over the middle of the screen would still swallow a click. */}
        {phase.lock && (
          <div
            className="kgate"
            ref={setLock}
            style={
              {
                '--kg-scale': gateScale.toFixed(3),
                '--kt-ar': gateLeaf.w / gateLeaf.h,
              } as React.CSSProperties
            }
          >
            <GateLock unlocking={unlocking} onUnlock={unlock} />
          </div>
        )}

        <div className="ktun__copy" ref={copyRef} style={{ pointerEvents: phase.copyLive ? 'auto' : 'none' }}>
          <HeroCopy />
        </div>

        {/* After the tunnel and the copy in the document: the wall's "THE DOOR
            WALL" is an <h2> and must not stand ahead of the page's own <h1> in
            the heading outline. Paint order is z-index, so this costs nothing
            visually. */}
        <div
          className="ktwall"
          ref={wallRef}
          style={{
            visibility: phase.wallParked ? 'hidden' : 'visible',
            /* ⚠️ `visibility: hidden` hides the wall but does NOT release its
               composited layers; `content-visibility: hidden` skips the
               subtree outright and hands all ~60 of them back for the first
               third of the track.
               ⚠️ **Measured again on 2026-11-11, with the tunnel a canvas, and
               it still earns its place.** Leaving the wall live from its idle
               mount (so nothing is laid out mid-flight) was tried: the pane
               went from ~40 compositor layers to ~105 for the whole flight and
               main-thread time over a 3s scrub rose by half (1160 → 1790ms at
               6× CPU throttle on a phone profile), against an un-park hitch
               that measures as a single 27ms frame at the same throttle. The
               steady cost loses to the one-off.
               ⚠️ It brings size containment, so DriftWall's ResizeObserver
               reads nothing while it is on; harmless *because*
               `.doorwall__wall`'s height is pure CSS, not content-derived. */
            contentVisibility: phase.wallParked ? 'hidden' : 'visible',
            pointerEvents: phase.wallInteractive ? 'auto' : 'none',
          }}
          /* `inert` rather than a tabIndex sweep: the wall is a whole
             interactive subtree (28 tiles, a viewer, a close button), and while
             the hero is still flying none of it should be reachable by tab or
             announced by a screen reader. */
          inert={!phase.wallInteractive}
        >
          {/* A stale chunk after a redeploy should cost the landing and nothing
              else, so this fails to the band's own ground rather than to a
              crash screen under the hero. */}
          <ErrorBoundary label="door-wall" fallback={null}>
            <Suspense fallback={null}>
              {wallMounted && <DoorWall compact paused={!wallLive} headShown={phase.headShown} />}
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Quieter than it was, and kept. The key is the loud invitation, but a
            visitor who ignores it and starts scrolling must not be left
            wondering whether scrolling does anything. */}
        <button
          type="button"
          className="hero__scrollcue hero__scrollcue--quiet"
          ref={cueRef}
          style={{ pointerEvents: phase.copyLive ? 'auto' : 'none' }}
          onClick={peek}
          tabIndex={phase.copyLive ? 0 : -1}
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
