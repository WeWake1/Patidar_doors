/**
 * How wide is that door, really?
 *
 * The customer has outlined a rectangle they know the shape of — their own
 * door — photographed at some unknown angle. That is enough to recover its
 * true proportions, because a perspective view of a rectangle constrains the
 * camera: the two pairs of parallel edges give two vanishing points, and those
 * directions must be perpendicular in the real world. One unknown (the focal
 * length) falls out of that, and the rectangle's aspect ratio falls out of the
 * focal length.
 *
 * Ask one more question — "how tall is your current door?", answered by a tap
 * on a chip — and the width follows in inches. That runs the existing
 * `snapToStock` → `calcPrice` path, so a photograph becomes a quote.
 *
 * ⚠️ This is a **guide size, not a cutting size.** It is good to roughly 1–3%
 * on the ratio, so ±0.3–1″ on a typical width. `snapToStock` rounds *up* to the
 * smallest covering panel and the width rungs are 1–3″ apart, so an error
 * usually lands in the same price band — but the number must never reach the
 * workshop unlabelled. The order message the workshop cuts from is built in
 * Checkout, and this number does not go there.
 *
 * Method: Zhang & He's rectangle rectification. Pure geometry, no dependencies.
 */

import { rectQuad, solveHomography, type Quad } from './homography'

export interface Rectified {
  /** Physical width ÷ physical height of the outlined rectangle. */
  ratio: number
  /**
   * False when the shot was too square-on for perspective to say anything and
   * we fell back to the outline's shape in the image. That is not a failure —
   * for a genuinely frontal photograph it is the correct answer.
   */
  fromPerspective: boolean
}

/** Anything outside this is a mis-drag, not a door. */
const MIN_RATIO = 0.08
const MAX_RATIO = 12

/**
 * `quad` must be in **image pixel** coordinates, wound clockwise from the
 * top-left — so edge 0→1 is the rectangle's width and 0→3 its height.
 */
export function rectifyAspect(quad: Quad, imgW: number, imgH: number): Rectified | null {
  const h = solveHomography(rectQuad(1, 1), quad)
  if (!h) return null

  /* The homography's first two columns are the vanishing points of the
     rectangle's two edge directions — h·(1,0,0) and h·(0,1,0). */
  const u0 = imgW / 2
  const v0 = imgH / 2
  const c1 = h[6]
  const c2 = h[7]
  const a1 = h[0] - u0 * c1
  const b1 = h[3] - v0 * c1
  const a2 = h[1] - u0 * c2
  const b2 = h[4] - v0 * c2

  /* Orthogonality of the two world directions, through the image of the
     absolute conic, leaves one unknown: f² = −(a1a2 + b1b2) / (c1c2).
     Assumes square pixels, no skew, and the principal point at the image
     centre — all safe for a phone camera. */
  const denom = c1 * c2
  const f2 = denom === 0 ? -1 : -(a1 * a2 + b1 * b2) / denom

  /* A near-frontal shot pushes both vanishing points toward infinity, so
     c1·c2 → 0 and f² explodes or goes negative. Rather than guess, fall back
     to the outline's own shape in the image — which is exactly the limit this
     formula tends to as f → ∞, so the two branches agree at the boundary
     instead of jumping. */
  const diag2 = imgW * imgW + imgH * imgH
  const usable = Number.isFinite(f2) && f2 > 0.05 * diag2 && f2 < 40 * diag2

  const ratio = usable
    ? Math.sqrt((a1 * a1 + b1 * b1) / f2 + c1 * c1) / Math.sqrt((a2 * a2 + b2 * b2) / f2 + c2 * c2)
    : Math.hypot(a1, b1) / Math.hypot(a2, b2)

  if (!Number.isFinite(ratio) || ratio < MIN_RATIO || ratio > MAX_RATIO) return null
  return { ratio, fromPerspective: usable }
}

/**
 * The outlined door in inches, given how tall the customer says it is.
 *
 * Rounds to the quarter-inch the sliders work in and clamps to what we sell,
 * so the result can be handed straight to `snapToStock` / `quoteFor`.
 */
export function sizeFromHeight(
  ratio: number,
  heightIn: number,
  limits: { height: { min: number; max: number }; width: { min: number; max: number }; step: number },
): { heightIn: number; widthIn: number } {
  const q = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Math.round(v / limits.step) * limits.step))
  return {
    heightIn: q(heightIn, limits.height.min, limits.height.max),
    widthIn: q(heightIn * ratio, limits.width.min, limits.width.max),
  }
}
