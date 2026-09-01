import { clamp01, easeOutCubic, seg } from './useTrackProgress'

/**
 * The keyhole hero's tunnel, as pure arithmetic.
 *
 * ⚠️ **This file exists so the scrub has exactly one source of numbers.**
 * The hero is driven two ways and must look identical either way: by CSS
 * scroll-driven animations on the compositor (the fast path, generated into
 * `src/styles/hero-scrub.gen.css` by `npm run scrub:build`), and by
 * `HeroKeyhole`'s React render (the fallback, for engines without
 * `animation-timeline`). Both import from here. A second copy of any of these
 * constants would drift on the one thing nobody notices — where a door is —
 * and the two paths would disagree on browsers that switch between them.
 *
 * ⚠️ Change anything here and **re-run `npm run scrub:build`**, or the CSS
 * keeps animating the old tunnel while the fallback animates the new one.
 * `build` runs it, so a deploy cannot ship them out of step; a dev server can.
 *
 * The geometry itself is documented at the constants in `HeroKeyhole.tsx`'s
 * header — this file is deliberately only the numbers and the functions of p,
 * with no React and no DOM, so the generator can import it.
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

/** How far a leaf swings, in degrees. Every door in the field, gate included. */
export const OPEN_DEG = 72

/** The whole field advances together; door i sits one SPACING behind door i−1. */
export function travelFor(near: number): number {
  return TUNNEL_IDS.length * SPACING + GATE_DEPTH + near
}

/** Door i's z at progress p. Linear in p across the TUNNEL slice — which is
    what lets the CSS path express the flight in two keyframes per door. */
export function doorZ(i: number, p: number, near: number): number {
  return -i * SPACING - GATE_DEPTH + seg(p, TUNNEL[0], TUNNEL[1]) * travelFor(near)
}

/** Emerging from the dark, then cut as it reaches the camera. */
export function doorOpacity(z: number, near: number): number {
  const fog = clamp01((z - FOG_IN) / (FOG_FULL - FOG_IN))
  const gone = 1 - clamp01((z - (near - 220)) / 220)
  return fog * gone
}

/** 0–1. Every door but the gate opens on its own approach. */
export function doorOpen(z: number): number {
  return easeOutCubic(clamp01((z + 1000) / 1100))
}

/** The gate opens on *progress* instead — the swing is the answer to the key. */
export function gateOpen(p: number): number {
  return easeOutCubic(seg(p, GATE_OPEN[0], GATE_OPEN[1]))
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
