import { clamp01, easeInOutSine, seg } from './useTrackProgress'

/**
 * The keyhole hero's tunnel, as pure arithmetic.
 *
 * ⚠️ **This file is the one source of numbers for the hero.** `HeroKeyhole`
 * reads the page's scroll position, asks this file where every door is, and
 * hands the answer to `tunnelCanvas.ts`, which draws it into a single canvas.
 * Nothing here knows about React, the DOM or WebGL — it is functions of
 * progress `p` (0 at the top of the hero's track, 1 at the bottom) and nothing
 * else, which is what lets `verify:e2e` check the hero against the same
 * arithmetic it was drawn from.
 *
 * (Until 2026-11-11 the hero was driven two ways at once — CSS scroll-driven
 * animations generated from this file into a 1,900-line stylesheet, plus a
 * React fallback writing the same values inline — and this file existed to
 * stop those two drifting apart. Both are gone; see the note at the top of
 * `tunnelCanvas.ts` for why. One path now, so nothing to keep in step.)
 *
 * The geometry itself is documented at the constants in `HeroKeyhole.tsx`'s
 * header.
 */

/* ── phases, as slices of track progress ─────────────────────────────────── */
export const GATE_OPEN = [0.02, 0.15] as const
export const TUNNEL = [0.13, 0.7] as const
export const WALL_IN = 0.46
export const WALL_FULL = 0.66

/* ── the tunnel, in world px in front of a CSS `perspective` of 900 ──────── */
export const PERSPECTIVE = 900
export const SPACING = 900
export const GATE_DEPTH = 120
export const NEAR = 700
export const NEAR_MOBILE = 560
export const FOG_IN = -5200
export const FOG_FULL = -3000

export const OFFSETS: [number, number][] = [
  [0, 0],
  [-54, 12],
  [46, -16],
  [-40, -8],
  [58, 18],
]
export const OFFSET_SCALE_MOBILE = 0.35

export const TUNNEL_IDS = [
  'architect-teak-door',
  'burma-teak-door',
  'veneer-cng-door',
  'microcoat-door',
  'wpc-cnc-door',
]

/**
 * ⚠️ **A phone flies the same five.** It ran a three-door subset from
 * 2026-09-01 to 2026-09-10 as a compositor-memory measure. The doors are
 * quads in one canvas now, so the count costs a few draw calls and nothing
 * else. Still a separate constant, because `NEAR_MOBILE` and
 * `OFFSET_SCALE_MOBILE` make the phone field a different schedule even with
 * the same doors in it.
 */
export const TUNNEL_IDS_MOBILE = TUNNEL_IDS

/** How far a leaf swings, in degrees. Every door in the field, gate included.
    ⚠️ Past ~80° a leaf hinged at its left edge presents almost nothing but its
    own thickness to the camera, so the photograph — the entire point of using
    real doors — stops being visible exactly when it is closest. */
export const OPEN_DEG = 72

/* ── where in the approach a leaf swings ───────────────────────────────────
   ⚠️⚠️ **The swing is placed against `near`, so it finishes as the door reaches
   the camera — it is not a fixed depth, and it is not an ease-out.** Until
   2026-09-10 it was both: `easeOutCubic` over z −1000 → +100, which put the
   entire turn between 0.53× and 1.13× on screen and 45° of it inside the first
   200 px. The consequence is what a visitor actually reported — *"as one door
   opens and you scroll further, the next door is already open, and you don't
   really get the animation of the doors opening"* — and the arithmetic agrees:
   a door reached full open at 1.13×, i.e. before the whole rush from 1.3× to
   4.5× had even begun, and the door behind it was already 33° open at that
   moment. Every leaf you were close enough to look at had finished moving.

   Now: a leaf holds shut through the far half of its approach, swings through
   the near half, and is wide open a beat before it starts to fade. Measured on
   the desktop field (near 700): 0° at 0.51×, 13° at 0.69×, 55° at life size,
   72° at 1.8× — and the door behind it is 13° at that moment, so they open one
   at a time, each in its turn, like a hall of doors opening ahead of you. */

/** How much depth the swing takes. Wide enough that the turn is a move rather
    than a flick, narrow enough (against SPACING = 900) that no more than two
    leaves are ever turning at once. */
export const SWING_SPAN = 1250
/** How far in front of the fade (`near − 220`) the leaf reaches full open, so
    there is a beat of open door rushing at you before it dissolves. */
export const SWING_LEAD = 300

/** The whole field advances together; door i sits one SPACING behind door i−1.
    ⚠️ `count` is the size of the field being drawn — five on both breakpoints
    since 2026-09-10 — and it sets the travel, so a field of a different size
    is a different schedule rather than the same one with doors hidden. */
export function travelFor(near: number, count: number): number {
  return count * SPACING + GATE_DEPTH + near
}

/**
 * Door i's z at progress p. Linear in p across the TUNNEL slice.
 *
 * ⚠️ **A door that has reached `near` is parked, never left to run on.** Its
 * projection is `PERSPECTIVE / (PERSPECTIVE − z)`, so any z at or past 900 is
 * *behind the viewer*: the divide goes to infinity and then negative, and
 * unclamped the field runs to z ≈ 5060 by the end of the track. `doorOpacity`
 * reaches 0 exactly at z = near, so a parked door is one nobody could see
 * anyway — the renderer skips it outright.
 */
export function doorZ(i: number, p: number, near: number, count: number): number {
  const z = -i * SPACING - GATE_DEPTH + seg(p, TUNNEL[0], TUNNEL[1]) * travelFor(near, count)
  return z <= near ? z : PARK_Z
}

/** Where a door "is" once it has passed: far away and fully fogged, so every
    function of z below reports it shut and invisible. */
const PARK_Z = -9000

/** Emerging from the dark, then cut as it reaches the camera. */
export function doorOpacity(z: number, near: number): number {
  const fog = clamp01((z - FOG_IN) / (FOG_FULL - FOG_IN))
  const gone = 1 - clamp01((z - (near - 220)) / 220)
  return fog * gone
}

/** 0–1. Every door but the gate opens on its own approach — see SWING_SPAN.
    ⚠️ It takes `near`, because that is what the window is anchored to: a phone
    cuts the pass at 2.65× where a desktop runs to 4.5×, so the same fixed depth
    would land in a different part of the two approaches. */
export function doorOpen(z: number, near: number): number {
  const end = near - SWING_LEAD
  return easeInOutSine(clamp01((z - (end - SWING_SPAN)) / SWING_SPAN))
}

/** The gate opens on *progress* instead — the swing is the answer to the key,
    not to an approach, since it is already standing in front of you. Same
    curve as the field behind it, so one hall of doors swings one way. */
export function gateOpen(p: number): number {
  return easeInOutSine(seg(p, GATE_OPEN[0], GATE_OPEN[1]))
}

export function hallOpacity(p: number): number {
  return 1 - seg(p, WALL_IN + 0.04, 0.7)
}

/** How bright the room behind a leaf is, dimmed as the corridor takes over. */
export function glowAt(p: number): number {
  return 0.28 + 0.72 * hallOpacity(p)
}

export function raysOpacity(p: number): number {
  return 1 - seg(p, 0.15, 0.27)
}

export function copyOpacity(p: number): number {
  return 1 - seg(p, 0.1, 0.2)
}

export function wallOpacity(p: number): number {
  return seg(p, WALL_IN, WALL_FULL)
}

export function lockOpacity(p: number): number {
  return 1 - seg(p, 0.005, 0.05)
}

/** The wall's headline lands after the last door has gone past, not with it. */
export function headOpacityAt(p: number): number {
  return seg(p, 0.64, 0.74)
}

/** The edge shade as a leaf turns away from the light. */
export function shadeOpacity(open: number): number {
  return open * 0.8
}

/* ── one field per breakpoint ───────────────────────────────────────────── */

/** Which doors fly, where the pass is cut, and how far off-axis they drift. */
export interface TunnelField {
  ids: readonly string[]
  near: number
  offsetScale: number
}

export function fieldFor(mobile: boolean): TunnelField {
  return mobile
    ? { ids: TUNNEL_IDS_MOBILE, near: NEAR_MOBILE, offsetScale: OFFSET_SCALE_MOBILE }
    : { ids: TUNNEL_IDS, near: NEAR, offsetScale: 1 }
}

/** A door plane's size on screen as a multiple of life size. */
export function projectedScale(z: number): number {
  return PERSPECTIVE / (PERSPECTIVE - z)
}
