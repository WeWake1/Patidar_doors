/**
 * Where to put the four handles before the customer touches anything.
 *
 * This is deliberately a *guess*, not a detector, and the distinction is the
 * whole design:
 *
 * · It runs synchronously before the place step's first paint, so the handles
 *   are simply already there. No "Detecting…" state is ever shown, and there is
 *   nothing to wait for.
 * · When it isn't confident it returns null and the caller centres a default
 *   quad. The customer cannot tell which happened, which is the point.
 * · It never runs again after a drag. The dragged quad is always the truth.
 *
 * A detector that is right 60% of the time is worse than none — the user has to
 * notice it is wrong before they can undo it. So the bar here is only "start
 * closer than the centre of the screen would", and the cost of clearing that
 * bar is ~15 ms and zero bytes of download. The alternatives were weighed and
 * both are disqualified on weight alone for a store browsed on mid-range
 * Androids: OpenCV.js is 1.5–8 MB, and an ONNX segmentation stack is 6–8 MB
 * *and* would drag COOP/COEP across the whole site for its threaded runtime.
 *
 * If people turn out to fight the handles, the honest next step is an
 * angle-restricted Hough on this same gradient image — still zero bytes — not
 * a model.
 */

import type { Quad } from './homography'
import { downscale } from './photoLoad'

/** Enough resolution for two strong vertical edges; ~43k pixels to sweep. */
const WORK_EDGE = 240

/** A door leaf's height:width. `LEAF_H / LEAF_W` — 96″ × 36″. */
const DOOR_ASPECT = 800 / 300

export interface GuessOptions {
  /**
   * Look for the door's bottom edge instead of deriving it from a standard
   * leaf's proportions.
   *
   * **Off for the storefront, on for `/admin`,** and the split is about what
   * is in the photograph. A customer photographs the doorway they are standing
   * in front of: the sill is usually cut off, or buried in floor texture and
   * shadow, and a wrong sill is invisible to someone who has never seen the
   * right one. A catalogue photo is a shop's product shot — the whole leaf is
   * in frame, floor included — and the owner is looking straight at it and can
   * see in one glance whether the line landed.
   *
   * Falls back to the derived sill whenever the edge it finds is weak or would
   * make a shape no door is, so turning it on can only improve the guess.
   */
  findSill?: boolean
}

/**
 * The four corners of what is probably the door, in **canvas pixel**
 * coordinates, or null when nothing convincing was found.
 */
export function guessDoorQuad(canvas: HTMLCanvasElement, opts: GuessOptions = {}): Quad | null {
  const small = downscale(canvas, WORK_EDGE)
  if (!small) return null
  const ctx = small.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const W = small.width
  const H = small.height
  if (W < 24 || H < 24) return null

  const { data } = ctx.getImageData(0, 0, W, H)
  const gray = new Float32Array(W * H)
  for (let i = 0, p = 0; p < gray.length; i += 4, p++) {
    gray[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
  }

  /* ── the two uprights ─────────────────────────────────── */
  const y0 = Math.floor(H * 0.15)
  const y1 = Math.ceil(H * 0.85)
  const col = new Float32Array(W)
  for (let y = y0; y < y1; y++) {
    for (let x = 1; x < W - 1; x++) {
      col[x] += Math.abs(sobelX(gray, W, H, x, y))
    }
  }
  smooth(col)

  const gap = Math.max(2, Math.round(W * 0.04))
  const a = peak(col, 0, W, -1, 0)
  if (a < 0) return null
  const b = peak(col, 0, W, a, gap)
  if (b < 0) return null

  const left = Math.min(a, b)
  const right = Math.max(a, b)
  const sep = right - left
  if (sep < W * 0.15 || sep > W * 0.85) return null

  // Both uprights have to stand well clear of the picture's ordinary clutter,
  // and be of comparable strength — one strong edge beside one weak one is
  // usually a wall corner and a picture frame, not a door.
  const mean = average(col)
  if (mean <= 0) return null
  const sa = col[a] / mean
  const sb = col[b] / mean
  if (sa < 1.8 || sb < 1.8) return null
  if (Math.min(sa, sb) / Math.max(sa, sb) < 0.35) return null

  /* ── the head ─────────────────────────────────────────── */
  const xa = left + 2
  const xb = right - 2
  const rowTo = Math.ceil(H * 0.6)
  const row = new Float32Array(H)
  for (let y = 1; y < rowTo; y++) {
    for (let x = xa; x < xb; x++) {
      row[y] += Math.abs(sobelY(gray, W, H, x, y))
    }
  }
  smooth(row)
  const head = peak(row, Math.floor(H * 0.02), rowTo, -1, 0)
  const rowMean = average(row.subarray(0, rowTo))
  const top = head >= 0 && rowMean > 0 && row[head] / rowMean > 1.5 ? head : Math.max(0, (H - sep * DOOR_ASPECT) / 2)

  // Doors run to the floor far more often than they end mid-frame, so derive
  // the sill from a standard leaf rather than hunting a threshold edge that is
  // usually buried in floor texture. Running out of frame is normal and fine.
  const derived = Math.min(H, top + sep * DOOR_ASPECT)
  const bottom = opts.findSill ? findSill(gray, W, H, xa, xb, top, derived) : derived
  if (bottom - top < H * 0.2) return null

  const k = canvas.width / W
  const S = (x: number, y: number) => ({ x: x * k, y: y * k })
  return [S(left, top), S(right, top), S(right, bottom), S(left, bottom)]
}

/**
 * The strongest horizontal edge below the door's midpoint — its sill.
 *
 * Only ever *replaces* the derived sill, and only when the edge is both strong
 * against the rest of the column and leaves a shape a door could actually be.
 * Every rejection returns `derived`, so this cannot make the guess worse than
 * it was without it.
 */
function findSill(
  gray: Float32Array,
  W: number,
  H: number,
  xa: number,
  xb: number,
  top: number,
  derived: number,
): number {
  // Search below the middle of the derived leaf, so a mid-height rail — the
  // lock rail on a panelled door — cannot be mistaken for the floor line.
  const from = Math.max(top + 1, Math.round(top + (derived - top) * 0.55))
  const to = Math.min(H - 1, Math.round(top + (derived - top) * 1.35))
  if (to - from < 4) return derived

  const row = new Float32Array(H)
  for (let y = from; y < to; y++) {
    for (let x = xa; x < xb; x++) row[y] += Math.abs(sobelY(gray, W, H, x, y))
  }
  smooth(row)

  const band = row.subarray(from, to)
  const mean = average(band)
  const sill = peak(row, from, to, -1, 0)
  if (sill < 0 || mean <= 0 || row[sill] / mean < 1.6) return derived

  // A leaf is between ~1.6 and ~3.4 times as tall as it is wide. Anything
  // outside that is a skirting board, a floor joint or a reflection.
  const aspect = (sill - top) / (xb - xa)
  if (aspect < 1.6 || aspect > 3.4) return derived
  return sill
}

function sobelX(g: Float32Array, W: number, H: number, x: number, y: number): number {
  const yUp = y > 0 ? y - 1 : y
  const yDn = y < H - 1 ? y + 1 : y
  const l = x - 1
  const r = x + 1
  return (
    g[yUp * W + r] + 2 * g[y * W + r] + g[yDn * W + r] -
    (g[yUp * W + l] + 2 * g[y * W + l] + g[yDn * W + l])
  )
}

function sobelY(g: Float32Array, W: number, H: number, x: number, y: number): number {
  const yUp = y > 0 ? y - 1 : y
  const yDn = y < H - 1 ? y + 1 : y
  const l = x > 0 ? x - 1 : x
  const r = x < W - 1 ? x + 1 : x
  return (
    g[yDn * W + l] + 2 * g[yDn * W + x] + g[yDn * W + r] -
    (g[yUp * W + l] + 2 * g[yUp * W + x] + g[yUp * W + r])
  )
}

/** Radius-1 box blur, so one edge doesn't register as two adjacent peaks. */
function smooth(v: Float32Array): void {
  const prev = Float32Array.from(v)
  for (let i = 1; i < v.length - 1; i++) {
    v[i] = (prev[i - 1] + prev[i] + prev[i + 1]) / 3
  }
}

/** Index of the largest value in [from,to), at least `gap` away from `avoid`. */
function peak(v: Float32Array, from: number, to: number, avoid: number, gap: number): number {
  let best = -1
  for (let i = from; i < to; i++) {
    if (avoid >= 0 && Math.abs(i - avoid) < gap) continue
    if (best < 0 || v[i] > v[best]) best = i
  }
  return best
}

function average(v: Float32Array): number {
  let s = 0
  for (let i = 0; i < v.length; i++) s += v[i]
  return s / v.length
}
