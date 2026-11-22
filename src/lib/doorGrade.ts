/**
 * How much the room's light bends the leaf.
 *
 * Shared on purpose: the live preview turns this into CSS filters and overlay
 * divs, and the export turns the *same numbers* into pixels. If the two ever
 * compute their own, the picture the customer saves stops being the picture
 * they approved — which is the one thing this feature cannot afford, because
 * the saved picture is what they send us.
 *
 * Every value is clamped hard, deliberately. A composite that is fractionally
 * too neutral is invisible; one that is too aggressive reads as a fault. Over-
 * tint a walnut leaf under a CFL and the customer concludes we showed them the
 * wrong finish.
 */

import { clamp, type Ambient } from './photoLoad'

export interface Grade {
  /** Multiplier on the leaf's luminance. */
  brightness: number
  /** The room's colour cast, applied as a `color` blend at `a`. */
  tint: { r: number; g: number; b: number; a: number } | null
  /** >0 darkens the foot of the door, <0 the head. 0 means don't bother. */
  falloff: number
}

const NEUTRAL: Grade = { brightness: 1, tint: null, falloff: 0 }

export function gradeFor(a: Ambient | null): Grade {
  if (!a) return NEUTRAL
  const f = clamp(a.falloff, -0.5, 0.5)

  /* A nudge toward the room, not a re-exposure — the artwork is already drawn
     at a sane exposure. This was `luma / 0.55`, which pinned to the ceiling on
     any ordinary daylit wall (a plain magnolia wall photographs at ~0.82) and
     visibly bleached the leaf. */
  const brightness = clamp(0.82 + a.luma * 0.32, 0.85, 1.12)

  /* Tint in proportion to how coloured the light actually is. A `color` blend
     carries the source's saturation as well as its hue, so a fixed alpha
     against a near-neutral wall doesn't warm the door — it *drains* it, and
     Golden Teak came out looking like grey oak. Scaling by the surround's own
     saturation means a lamplit hallway tints and a white wall leaves the
     finish alone. */
  const alpha = 0.18 * clamp(saturation(a.r, a.g, a.b) * 3.5, 0, 1)

  return {
    brightness,
    tint: alpha > 0.01 ? { r: a.r, g: a.g, b: a.b, a: alpha } : null,
    falloff: Math.abs(f) < 0.02 ? 0 : f,
  }
}

function saturation(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b)
  return mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx
}

/** The strength of the fall-off wash at `v` (0 = head, 1 = foot). */
export function falloffAt(falloff: number, v: number): number {
  if (falloff === 0) return 0
  // Matches the CSS: transparent until 40%, then ramping to |falloff| * 0.5.
  const t = falloff > 0 ? v : 1 - v
  if (t <= 0.4) return 0
  return ((t - 0.4) / 0.6) * Math.abs(falloff) * 0.5
}

/**
 * CSS's `color` blend mode: the tint's hue and saturation carried at the
 * backdrop's luminosity. Implemented from the compositing spec rather than
 * approximated, because a plain RGB lerp toward the wall colour visibly
 * washes the grain out and a cheap approximation here is exactly what makes a
 * composite look pasted.
 *
 * All channels 0–1.
 */
export function blendColor(
  br: number,
  bg: number,
  bb: number,
  sr: number,
  sg: number,
  sb: number,
): [number, number, number] {
  return setLum(sr, sg, sb, lum(br, bg, bb))
}

function lum(r: number, g: number, b: number): number {
  return 0.3 * r + 0.59 * g + 0.11 * b
}

function setLum(r: number, g: number, b: number, l: number): [number, number, number] {
  const d = l - lum(r, g, b)
  return clipColor(r + d, g + d, b + d)
}

function clipColor(r: number, g: number, b: number): [number, number, number] {
  const l = lum(r, g, b)
  const n = Math.min(r, g, b)
  const x = Math.max(r, g, b)
  if (n < 0) {
    const k = l / (l - n)
    r = l + (r - l) * k
    g = l + (g - l) * k
    b = l + (b - l) * k
  }
  if (x > 1) {
    const k = (1 - l) / (x - l)
    r = l + (r - l) * k
    g = l + (g - l) * k
    b = l + (b - l) * k
  }
  return [r, g, b]
}
