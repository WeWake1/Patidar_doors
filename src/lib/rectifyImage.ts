/**
 * Straightening a photographed rectangle into a clean, head-on image.
 *
 * This is what the admin's cropper does when you drag four corners onto a door:
 * the quad you drew is mapped back to a true rectangle, which crops the
 * background away and removes the camera's tilt in a single operation. The
 * output is the door leaf and nothing else.
 *
 * It is the same projective map the storefront uses to put a door *into* a
 * customer's doorway, run in the opposite direction — one piece of arithmetic
 * serving both ends of the feature.
 */

import { invert, solveHomography, type Point, type Quad } from './homography'

/**
 * Supersample before downscaling. A direct inverse sample straight to the
 * target size undersamples wherever the source is denser than the output —
 * which is most of a phone photo — and the result crawls with aliasing on
 * exactly the fine detail a door has: grain, grooves, mouldings. Warping large
 * and letting the browser's filtered downscale do the reduction is far cheaper
 * than a proper filter kernel and looks the same.
 */
const SUPERSAMPLE = 2

/** Beyond this the intermediate surface costs more memory than the quality is worth. */
const MAX_INTERMEDIATE = 3200

export function rectifyToCanvas(
  img: HTMLImageElement,
  /** The four corners, in the image's own pixels, clockwise from top-left. */
  quad: Quad,
  outW: number,
  outH: number,
): HTMLCanvasElement {
  const w = Math.max(1, Math.round(outW))
  const h = Math.max(1, Math.round(outH))
  const scale = Math.min(SUPERSAMPLE, MAX_INTERMEDIATE / Math.max(w, h))
  const bigW = Math.max(w, Math.round(w * scale))
  const bigH = Math.max(h, Math.round(h * scale))

  const source = document.createElement('canvas')
  source.width = img.naturalWidth
  source.height = img.naturalHeight
  const sctx = source.getContext('2d', { willReadFrequently: true })
  if (!sctx) throw new Error('rectify: no 2d context')
  sctx.drawImage(img, 0, 0)
  const src = sctx.getImageData(0, 0, source.width, source.height)

  // Destination rectangle → the quad the owner drew, then inverted, so each
  // output pixel can ask "where in the photo did I come from?"
  const h3 = solveHomography(
    [
      { x: 0, y: 0 },
      { x: bigW, y: 0 },
      { x: bigW, y: bigH },
      { x: 0, y: bigH },
    ],
    quad,
  )
  if (!h3) throw new Error('rectify: those corners do not form a usable shape')

  const big = document.createElement('canvas')
  big.width = bigW
  big.height = bigH
  const bctx = big.getContext('2d')
  if (!bctx) throw new Error('rectify: no 2d context')
  const out = bctx.createImageData(bigW, bigH)

  const sw = src.width
  const sh = src.height
  const sd = src.data
  const od = out.data

  for (let y = 0; y < bigH; y++) {
    for (let x = 0; x < bigW; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      const wq = h3[6] * cx + h3[7] * cy + h3[8]
      const o = (y * bigW + x) * 4
      if (wq === 0) continue
      const u = (h3[0] * cx + h3[1] * cy + h3[2]) / wq
      const v = (h3[3] * cx + h3[4] * cy + h3[5]) / wq
      if (u < 0 || v < 0 || u >= sw || v >= sh) continue

      // Bilinear — nearest-neighbour leaves visible stair-stepping on the
      // near-vertical edges of a door, which is most of what a door is.
      const x0 = Math.floor(u)
      const y0 = Math.floor(v)
      const x1 = Math.min(sw - 1, x0 + 1)
      const y1 = Math.min(sh - 1, y0 + 1)
      const fx = u - x0
      const fy = v - y0
      const i00 = (y0 * sw + x0) * 4
      const i10 = (y0 * sw + x1) * 4
      const i01 = (y1 * sw + x0) * 4
      const i11 = (y1 * sw + x1) * 4
      for (let c = 0; c < 4; c++) {
        const top = sd[i00 + c] + (sd[i10 + c] - sd[i00 + c]) * fx
        const bot = sd[i01 + c] + (sd[i11 + c] - sd[i01 + c]) * fx
        od[o + c] = top + (bot - top) * fy
      }
    }
  }
  bctx.putImageData(out, 0, 0)

  if (bigW === w && bigH === h) return big
  const final = document.createElement('canvas')
  final.width = w
  final.height = h
  const fctx = final.getContext('2d')
  if (!fctx) throw new Error('rectify: no 2d context')
  fctx.imageSmoothingQuality = 'high'
  fctx.drawImage(big, 0, 0, w, h)
  return final
}

/**
 * The same four corners wound the other way — top-left swapped with top-right,
 * bottom-left with bottom-right.
 *
 * This is how the cropper asks for a mirrored door, and it costs nothing:
 * `rectifyToCanvas` maps output (0,0) to `quad[0]`, so handing it the corners
 * in reversed order makes the leaf's right edge come out on the left. The Quad
 * doc in homography.ts already names this behaviour — "a quad wound the other
 * way doesn't error, it silently produces a mirrored door" — which is a trap
 * everywhere else in the codebase and exactly the tool wanted here. No second
 * canvas, no second pass over the pixels.
 */
export function flipWinding(q: Quad): Quad {
  return [q[1], q[0], q[3], q[2]]
}

/**
 * Reflect a quad across the vertical centre line of a `width`-wide box.
 *
 * Used to draw the handles over a photo the stage is showing mirrored. The
 * reflection is paired with `flipWinding` on purpose: reflecting alone would
 * leave index 0 sitting at the top *right* of what the owner sees, so the
 * corner roles the editor and `squareUp` index by would be back-to-front.
 * Together they are an involution — mirroring twice is the identity — so the
 * same call converts in both directions.
 */
export function mirrorQuad(q: Quad, width: number): Quad {
  const m = (p: Point): Point => ({ x: width - p.x, y: p.y })
  const f = flipWinding(q)
  return [m(f[0]), m(f[1]), m(f[2]), m(f[3])]
}

/**
 * Force a quad back to an axis-aligned rectangle, moving whichever corners
 * just changed and dragging their neighbours along.
 *
 * The cropper's plain-rectangle mode uses the same four handles as its corner
 * mode; this is the only difference between them.
 */
export function squareUp(next: Quad, prev: Quad): Quad {
  /** Corner order is TL, TR, BR, BL — so 0 shares an edge in x with 3, in y with 1. */
  const sharesX = [3, 2, 1, 0]
  const sharesY = [1, 0, 3, 2]
  const q: Quad = [{ ...next[0] }, { ...next[1] }, { ...next[2] }, { ...next[3] }]
  for (let i = 0; i < 4; i++) {
    if (next[i].x !== prev[i].x) q[sharesX[i]].x = next[i].x
    if (next[i].y !== prev[i].y) q[sharesY[i]].y = next[i].y
  }
  return q
}

/** `invert` is re-exported so callers need only this module. */
export { invert }
