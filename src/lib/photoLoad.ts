/**
 * Turning a customer's photo into pixels we can work with, safely.
 *
 * Three things here are not obvious and all three are bugs if you get them
 * wrong on a phone:
 *
 * 1. Decode through an <img>, never `createImageBitmap`. An <img> applies the
 *    JPEG's EXIF orientation by default (`image-orientation: from-image` is the
 *    initial value); `createImageBitmap` ignores it unless asked, and its
 *    option was ignored by shipping browsers for years. Get this wrong and a
 *    portrait doorway arrives on its side — the classic first bug in any
 *    photo tool.
 * 2. Cap immediately and release the original. A 12 MP phone JPEG is ~48 MB
 *    once decoded. Holding the original plus a preview plus an export surface
 *    is how a 3 GB Android kills the tab, and the visitor just sees the site
 *    crash.
 * 3. A failed <img> load calls onerror with an **Event**, not an Error, so
 *    `.message` is undefined. The admin's uploader already shipped an empty
 *    error box for exactly this (see src/admin/ImageDropCrop.tsx); we hand back
 *    a typed code instead so the UI always has real copy to show.
 */

import type { Quad } from './homography'

/** Refuse before decoding, not after — the decode is the expensive part. */
const MAX_BYTES = 20 * 1024 * 1024

/**
 * The long edge we keep. Big enough that the exported share image still looks
 * like a photograph, small enough that one surface is ~10 MB rather than ~48.
 */
const MAX_EDGE = 1600

/** Ambient colour is a median of a blurry surround; it needs no resolution. */
const THUMB_EDGE = 160

export type PhotoErrorCode = 'type' | 'size' | 'heic' | 'decode'

export class PhotoError extends Error {
  code: PhotoErrorCode
  constructor(code: PhotoErrorCode) {
    super(code)
    this.name = 'PhotoError'
    this.code = code
  }
}

export interface LoadedPhoto {
  /** Capped, EXIF-corrected pixels. Sampling and export read these. */
  canvas: HTMLCanvasElement
  /** Object URL for the same pixels — the preview <img> src. */
  url: string
  w: number
  h: number
  /** Revoke the URL and drop the backing store. Always call it. */
  release(): void
}

function looksHeic(file: File): boolean {
  return /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
}

/** Decode, EXIF-rotate, cap, and hand back both a canvas and a preview URL. */
export async function loadPhoto(file: File): Promise<LoadedPhoto> {
  if (!file.type.startsWith('image/') && !looksHeic(file)) throw new PhotoError('type')
  if (file.size > MAX_BYTES) throw new PhotoError('size')

  const srcUrl = URL.createObjectURL(file)
  let img: HTMLImageElement
  try {
    img = await decode(srcUrl)
  } catch {
    // Safari decodes HEIC; nothing else does. Only claim it when it fits.
    throw new PhotoError(looksHeic(file) ? 'heic' : 'decode')
  } finally {
    URL.revokeObjectURL(srcUrl)
  }

  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (!nw || !nh) throw new PhotoError('decode')

  const scale = Math.min(1, MAX_EDGE / Math.max(nw, nh))
  const w = Math.max(1, Math.round(nw * scale))
  const h = Math.max(1, Math.round(nh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('decode')
  ctx.drawImage(img, 0, 0, w, h)
  img.src = '' // let the full-size decode go now, not at the next GC

  const url = await toObjectUrl(canvas)
  return {
    canvas,
    url,
    w,
    h,
    release() {
      URL.revokeObjectURL(url)
      canvas.width = 0
      canvas.height = 0
    },
  }
}

function decode(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Same-origin blob: no crossOrigin needed, and the canvas stays untainted
    // so toBlob() works for the share image.
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode')) // the Event carries nothing useful
    img.src = url
  })
}

function toObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new PhotoError('decode'))),
      'image/jpeg',
      0.9,
    )
  })
}

/* ── ambient light ─────────────────────────────────────── */

export interface Ambient {
  /** Median surround colour, 0–255. */
  r: number
  g: number
  b: number
  /** Relative luminance of that median, 0–1. */
  luma: number
  /**
   * How much darker the bottom of the surround is than the top, −1…1.
   * Positive means the floor end is in shadow, which is the usual case and
   * the reason a flatly-lit door reads as pasted on.
   */
  falloff: number
}

/**
 * Median colour of a ring just *outside* the placed quad — i.e. the wall and
 * architrave around the customer's door, which is what the new leaf has to
 * agree with.
 *
 * Median rather than mean on purpose: one bright window in the frame drags a
 * mean far enough to tint the whole door.
 *
 * `quad` must already be in **canvas pixel** coordinates, not display ones.
 */
export function sampleAmbient(canvas: HTMLCanvasElement, quad: Quad): Ambient | null {
  const thumb = downscale(canvas, THUMB_EDGE)
  if (!thumb) return null
  const k = thumb.width / canvas.width
  const ctx = thumb.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const { data, width, height } = ctx.getImageData(0, 0, thumb.width, thumb.height)

  const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4
  const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4

  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []
  let topSum = 0
  let topN = 0
  let botSum = 0
  let botN = 0

  const PER_EDGE = 12
  const OUT = 1.07 // push the ring 7% out from the centroid, onto the wall
  for (let e = 0; e < 4; e++) {
    const a = quad[e]
    const b = quad[(e + 1) % 4]
    for (let s = 0; s < PER_EDGE; s++) {
      const f = (s + 0.5) / PER_EDGE
      const px = a.x + (b.x - a.x) * f
      const py = a.y + (b.y - a.y) * f
      const x = Math.round((cx + (px - cx) * OUT) * k)
      const y = Math.round((cy + (py - cy) * OUT) * k)
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const bl = data[i + 2]
      rs.push(r)
      gs.push(g)
      bs.push(bl)
      const l = luminance(r, g, bl)
      if (py < cy) {
        topSum += l
        topN++
      } else {
        botSum += l
        botN++
      }
    }
  }
  if (rs.length < 8) return null

  const r = median(rs)
  const g = median(gs)
  const b = median(bs)
  const top = topN ? topSum / topN : 0
  const bot = botN ? botSum / botN : 0
  return {
    r,
    g,
    b,
    luma: luminance(r, g, b),
    falloff: clamp(top - bot, -1, 1),
  }
}

function median(v: number[]): number {
  v.sort((a, b) => a - b)
  const m = v.length >> 1
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/** A small copy of `canvas`, long edge capped at `edge`. Shared with quadGuess. */
export function downscale(canvas: HTMLCanvasElement, edge: number): HTMLCanvasElement | null {
  const scale = Math.min(1, edge / Math.max(canvas.width, canvas.height))
  const w = Math.max(1, Math.round(canvas.width * scale))
  const h = Math.max(1, Math.round(canvas.height * scale))
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(canvas, 0, 0, w, h)
  return out
}
