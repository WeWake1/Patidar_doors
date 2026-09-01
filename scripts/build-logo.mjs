/**
 * Regenerate the web logo derivatives from the vector master, brand/patidar-logo.pdf.
 *
 *   npm run logo:build
 *
 * Emits: public/images/logo/patidar-mark{,-cream}.png
 *        public/favicon-32.png, public/apple-touch-icon.png
 *
 * The full lockup (patidar-logo{,-cream}-{1200,600}.png, og-image.png) is NOT
 * regenerated here — those were exported by hand and are correct.
 *
 * ⚠️ The monogram is CUT OUT of the lockup, it is not a separate artwork in the
 * PDF: the "PP" stem descends all the way to the wordmark's baseline, so the
 * wordmark sits inside the monogram's own bounding box. Cropping to a rectangle
 * either swallows "DOORS • PLYWOODS • BOARDS" or — which is what shipped until
 * 2026-09-01 — chops the stem off under the bowl and leaves a P with no leg.
 * So we crop to the stem's full height and erase the wordmark quadrant; the
 * generous empty gap between the stem and the wordmark's first letter (and
 * between the inner hook and the wordmark's cap height) is where the two cuts
 * land, and both are measured off the render rather than hardcoded.
 *
 * Needs poppler's `pdftoppm` on PATH (brew install poppler) — only ever run when
 * the brand mark itself changes, so it is not a build-time dependency.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PDF = path.join(ROOT, 'brand/patidar-logo.pdf')

const INK = { r: 0x21, g: 0x1a, b: 0x12 }   // --ink, for the cream page
const CREAM = { r: 0xf0, g: 0xe3, b: 0xc2 } // the cream the footer/icons use
const DEEP = '#1c1610'                      // --deep, the icon tile's ground

const MARK_H = 480      // ~5× the nav's tallest render (30px at DPR 3)
const INK_THRESHOLD = 160

function render(dir) {
  try {
    execFileSync('pdftoppm', ['-png', '-r', '600', '-singlefile', PDF, path.join(dir, 'lockup')])
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('pdftoppm not found — `brew install poppler`')
    throw err
  }
  return path.join(dir, 'lockup.png')
}

/** Where the monogram ends and the wordmark begins, measured off the render. */
function measure(lum, W, H) {
  const ink = (x, y) => lum[y * W + x] < INK_THRESHOLD

  let x0 = W, x1 = -1, y0 = H, y1 = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink(x, y)) {
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  if (x1 < 0) throw new Error('the render is blank')

  // The wordmark is the only thing that reaches past the halfway mark, and it is
  // the last band on the page — so the first row that does is its cap line.
  const far = x0 + (x1 - x0) / 2
  let wordTop = -1
  for (let y = y0; y <= y1 && wordTop < 0; y++)
    for (let x = x1; x > far; x--) if (ink(x, y)) { wordTop = y; break }
  if (wordTop < 0) throw new Error('no wordmark band found')

  // The stem is the contiguous run of inked columns from the left edge, taken
  // across the wordmark band where nothing else of the monogram is left.
  let stemRight = x0
  for (let x = x0; x <= x1; x++) {
    let hit = false
    for (let y = wordTop; y <= y1 && !hit; y++) if (ink(x, y)) hit = true
    if (!hit) break
    stemRight = x
  }

  let stemBottom = -1
  for (let y = y1; y >= y0 && stemBottom < 0; y--)
    for (let x = x0; x <= stemRight; x++) if (ink(x, y)) { stemBottom = y; break }

  let wordLeft = x1
  for (let y = wordTop; y <= y1; y++) for (let x = stemRight + 1; x < wordLeft; x++)
    if (ink(x, y)) { wordLeft = x; break }

  // Everything of the monogram that is right of the stem — the bowl and the
  // inner hook — lives above the wordmark.
  let markRight = stemRight, hookBottom = y0
  for (let y = y0; y < wordTop; y++) for (let x = x1; x > markRight; x--) if (ink(x, y)) { markRight = x; break }
  for (let y = wordTop - 1; y > y0; y--) {
    let hit = false
    for (let x = stemRight + 1; x <= markRight && !hit; x++) if (ink(x, y)) hit = true
    if (hit) { hookBottom = y; break }
  }

  if (wordLeft <= stemRight || wordTop <= hookBottom)
    throw new Error('the monogram and the wordmark overlap — the cuts are unsafe')

  return {
    x0, y0,
    right: markRight,
    bottom: stemBottom,
    cutX: Math.round((stemRight + wordLeft) / 2),
    cutY: Math.round((hookBottom + wordTop) / 2),
  }
}

/** RGBA of the monogram alone, keyed white→alpha, painted in `colour`. */
function cutMark(lum, W, m, colour) {
  const w = m.right - m.x0 + 1
  const h = m.bottom - m.y0 + 1
  const px = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = m.x0 + x, sy = m.y0 + y
    const i = (y * w + x) * 4
    px[i] = colour.r; px[i + 1] = colour.g; px[i + 2] = colour.b
    px[i + 3] = (sx > m.cutX && sy > m.cutY) ? 0 : 255 - lum[sy * W + sx]
  }
  return { data: px, info: { width: w, height: h, channels: 4 } }
}

const tile = (size, mark) => sharp({
  create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
}).composite([
  { input: Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.225}" fill="${DEEP}"/></svg>`) },
  mark,
]).png()

const dir = mkdtempSync(path.join(tmpdir(), 'patidar-logo-'))
try {
  const { data: lum, info } = await sharp(render(dir)).greyscale().raw().toBuffer({ resolveWithObject: true })
  const m = measure(lum, info.width, info.height)
  const aspect = (m.right - m.x0 + 1) / (m.bottom - m.y0 + 1)

  const out = (colour) => {
    const { data, info: raw } = cutMark(lum, info.width, m, colour)
    return sharp(data, { raw }).resize({ height: MARK_H }).png({ compressionLevel: 9 })
  }

  await out(INK).toFile(path.join(ROOT, 'public/images/logo/patidar-mark.png'))
  await out(CREAM).toFile(path.join(ROOT, 'public/images/logo/patidar-mark-cream.png'))

  // The mark is centred in the tile at a share of its height. The 32px favicon
  // fills more of its tile than the 180px one because the monogram is tall and
  // narrow — height-fitting it leaves wide side margins either way, and at 32px
  // the three parallel strokes need every pixel they can get to stay apart.
  for (const [size, fill, file] of [[32, 0.78, 'public/favicon-32.png'], [180, 0.68, 'public/apple-touch-icon.png']]) {
    const h = Math.round(size * fill)
    const glyph = await out(CREAM).resize({ height: h }).toBuffer()
    const w = Math.round(h * aspect)
    await tile(size, {
      input: glyph,
      left: Math.round((size - w) / 2),
      top: Math.round((size - h) / 2),
    }).toFile(path.join(ROOT, file))
  }

  console.log(`monogram ${m.right - m.x0 + 1}×${m.bottom - m.y0 + 1} (aspect ${aspect.toFixed(3)}) — wrote 4 files`)
  console.log(`nav/footer <img> attributes: width = round(height × ${aspect.toFixed(3)})`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
