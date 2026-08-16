/**
 * Burning the preview into a picture the customer can send us.
 *
 * ⚠️ **Lazily imported.** Nothing here is needed until someone taps Save, and
 * it is the only part of the try-on that touches pixels one at a time.
 *
 * The preview warps a live SVG with CSS `matrix3d`; a CSS transform cannot be
 * screenshotted, so the export inverts the *same* homography and samples on the
 * CPU. The two paths deliberately share `solveHomography` and `gradeFor`, so
 * the saved picture is the picture that was approved — which matters more here
 * than anywhere else on the site, because this image is what arrives on our
 * WhatsApp and what the customer shows their family.
 *
 * Cost is ~0.3–0.6 s on a mid-range Android for a full-frame door. That is a
 * one-shot behind an explicit tap, so it gets a real progress state rather than
 * a spinner that might flash for 80 ms.
 */

import { blendColor, falloffAt, gradeFor } from './doorGrade'
import { invert, mapPoint, rectQuad, solveHomography, type Quad } from './homography'
import type { Ambient } from './photoLoad'

/** How far below the leaf the contact shadow reaches. Matches `.tryd__contact`. */
const SHADOW_EXT = 1.06

/** Warm near-black — `--cast-deep`. A pure black multiply reads cold on a terracotta floor. */
const SHADOW_RGB = [10 / 255, 6 / 255, 2 / 255] as const

/** Softens the cut edge so the leaf doesn't end on a razor line. In door pixels. */
const FEATHER = 2.5

const BAND = {
  bg: '#1c1610',
  text: '#f0e3c2',
  rule: '#c9a964',
  quiet: '#968771',
}

export interface ComposeInput {
  /** The capped photo, from `loadPhoto`. */
  photo: HTMLCanvasElement
  /** Where the leaf goes, normalised 0–1 against the photo. */
  quadN: Quad
  /** The rasterised leaf, from `rasterizeDoor`. */
  door: HTMLImageElement
  flipped: boolean
  ambient: Ambient | null
  /** The strip burnt along the bottom. Null leaves the photo alone. */
  footer: { name: string; size: string; site: string } | null
}

export async function composeTryOn(input: ComposeInput): Promise<Blob> {
  const { photo, quadN, door, flipped, ambient, footer } = input
  const pw = photo.width
  const ph = photo.height
  const bandH = footer ? Math.round(Math.min(120, Math.max(56, ph * 0.075))) : 0

  const out = document.createElement('canvas')
  out.width = pw
  out.height = ph + bandH
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('compose: no 2d context')
  ctx.drawImage(photo, 0, 0)

  const dw = door.naturalWidth
  const dh = door.naturalHeight
  if (!dw || !dh) throw new Error('compose: the door artwork has no size')

  const dest: Quad = [
    { x: quadN[0].x * pw, y: quadN[0].y * ph },
    { x: quadN[1].x * pw, y: quadN[1].y * ph },
    { x: quadN[2].x * pw, y: quadN[2].y * ph },
    { x: quadN[3].x * pw, y: quadN[3].y * ph },
  ]
  // The flip is a sign change on the source rect, exactly as in DoorLayer —
  // not a second transform stacked on top.
  const from: Quad = flipped
    ? [{ x: dw, y: 0 }, { x: 0, y: 0 }, { x: 0, y: dh }, { x: dw, y: dh }]
    : rectQuad(dw, dh)

  const h = solveHomography(from, dest)
  const hi = h && invert(h)
  if (!h || !hi) throw new Error('compose: the outline is degenerate')

  /* The bounding box of the *extended* source rect, so the contact shadow's
     reach below the leaf is inside the region we touch. */
  const ext = dh * SHADOW_EXT
  const corners = [
    mapPoint(h, 0, 0),
    mapPoint(h, dw, 0),
    mapPoint(h, dw, ext),
    mapPoint(h, 0, ext),
  ]
  const x0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.x))))
  const y0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p.y))))
  const x1 = Math.min(pw, Math.ceil(Math.max(...corners.map((p) => p.x))))
  const y1 = Math.min(ph, Math.ceil(Math.max(...corners.map((p) => p.y))))
  if (x1 <= x0 || y1 <= y0) throw new Error('compose: the door falls outside the photo')

  const src = imageData(door, dw, dh)
  const band = ctx.getImageData(x0, y0, x1 - x0, y1 - y0)
  const px = band.data
  const bw = x1 - x0

  const grade = gradeFor(ambient)
  const tint = grade.tint
  const ta = tint ? tint.a : 0
  const tr = tint ? tint.r / 255 : 0
  const tg = tint ? tint.g / 255 : 0
  const tb = tint ? tint.b / 255 : 0

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // Sample at the pixel centre; sampling the corner shifts the whole leaf
      // half a pixel up-left and shows as a seam against the frame.
      const w = hi[6] * (x + 0.5) + hi[7] * (y + 0.5) + hi[8]
      if (w === 0) continue
      const u = (hi[0] * (x + 0.5) + hi[1] * (y + 0.5) + hi[2]) / w
      const v = (hi[3] * (x + 0.5) + hi[4] * (y + 0.5) + hi[5]) / w
      if (u < 0 || u >= dw || v < 0 || v >= ext) continue

      const o = ((y - y0) * bw + (x - x0)) * 4

      /* Contact shadow first — it lies on the floor, under the leaf. */
      const sa = shadowAt(v / ext)
      if (sa > 0) {
        px[o] = px[o] * (1 - sa + sa * SHADOW_RGB[0])
        px[o + 1] = px[o + 1] * (1 - sa + sa * SHADOW_RGB[1])
        px[o + 2] = px[o + 2] * (1 - sa + sa * SHADOW_RGB[2])
      }
      if (v >= dh) continue

      const s = sample(src, dw, dh, u, v)
      let a = s[3] / 255
      if (a <= 0) continue
      a *= feather(u, v, dw, dh)
      if (a <= 0) continue

      let r = (s[0] / 255) * grade.brightness
      let g = (s[1] / 255) * grade.brightness
      let b = (s[2] / 255) * grade.brightness
      if (ta > 0) {
        const [cr, cg, cb] = blendColor(r, g, b, tr, tg, tb)
        r += (cr - r) * ta
        g += (cg - g) * ta
        b += (cb - b) * ta
      }
      const fa = falloffAt(grade.falloff, v / dh)
      if (fa > 0) {
        const k = 1 - fa
        r *= k
        g *= k
        b *= k
      }

      px[o] = px[o] * (1 - a) + clamp255(r * 255) * a
      px[o + 1] = px[o + 1] * (1 - a) + clamp255(g * 255) * a
      px[o + 2] = px[o + 2] * (1 - a) + clamp255(b * 255) * a
    }
  }
  ctx.putImageData(band, x0, y0)

  if (footer) await drawBand(ctx, footer, pw, ph, bandH)

  return toBlob(out)
}

/** `.tryd__contact`'s gradient, in numbers: nothing, then a lip at the foot. */
function shadowAt(s: number): number {
  if (s < 0.9) return 0
  if (s < 0.94) return ((s - 0.9) / 0.04) * 0.45
  return (1 - (s - 0.94) / 0.06) * 0.45
}

function feather(u: number, v: number, dw: number, dh: number): number {
  const d = Math.min(u, dw - u, v, dh - v)
  return d >= FEATHER ? 1 : Math.max(0, d / FEATHER)
}

function imageData(img: HTMLImageElement, w: number, h: number): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const cx = c.getContext('2d', { willReadFrequently: true })
  if (!cx) throw new Error('compose: no 2d context for the door')
  cx.drawImage(img, 0, 0, w, h)
  return cx.getImageData(0, 0, w, h).data
}

function sample(d: Uint8ClampedArray, w: number, h: number, u: number, v: number): [number, number, number, number] {
  const x0 = Math.floor(u)
  const y0 = Math.floor(v)
  const x1 = Math.min(w - 1, x0 + 1)
  const y1 = Math.min(h - 1, y0 + 1)
  const fx = u - x0
  const fy = v - y0
  const i00 = (y0 * w + x0) * 4
  const i10 = (y0 * w + x1) * 4
  const i01 = (y1 * w + x0) * 4
  const i11 = (y1 * w + x1) * 4
  const out: [number, number, number, number] = [0, 0, 0, 0]
  for (let c = 0; c < 4; c++) {
    const top = d[i00 + c] + (d[i10 + c] - d[i00 + c]) * fx
    const bot = d[i01 + c] + (d[i11 + c] - d[i01 + c]) * fx
    out[c] = top + (bot - top) * fy
  }
  return out
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

/**
 * The strip along the foot. Every share becomes a small poster, which is the
 * whole marketing case for the feature — a photo forwarded without it is
 * anonymous.
 */
async function drawBand(
  ctx: CanvasRenderingContext2D,
  footer: { name: string; size: string; site: string },
  w: number,
  y: number,
  h: number,
): Promise<void> {
  // The self-hosted faces are already in the document; canvas will silently
  // fall back to a default if we draw before they are ready.
  await document.fonts.ready.catch(() => undefined)

  ctx.fillStyle = BAND.bg
  ctx.fillRect(0, y, w, h)
  ctx.fillStyle = BAND.rule
  ctx.fillRect(0, y, w, 2)

  const pad = Math.round(h * 0.34)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = BAND.text
  ctx.font = `500 ${Math.round(h * 0.34)}px "Cormorant Garamond", Georgia, serif`
  ctx.textAlign = 'left'
  ctx.fillText(footer.name, pad, y + h * 0.4)

  ctx.fillStyle = BAND.quiet
  ctx.font = `400 ${Math.round(h * 0.19)}px Archivo, system-ui, sans-serif`
  ctx.fillText(footer.size, pad, y + h * 0.73)

  ctx.textAlign = 'right'
  ctx.fillStyle = BAND.rule
  ctx.font = `500 ${Math.round(h * 0.19)}px Archivo, system-ui, sans-serif`
  ctx.fillText(footer.site, w - pad, y + h * 0.56)
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('compose: the picture could not be encoded'))),
      'image/jpeg',
      0.88,
    )
  })
}
