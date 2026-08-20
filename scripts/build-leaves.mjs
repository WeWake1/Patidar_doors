/**
 * Cut the door leaf out of each catalogue photograph.
 *
 * "See it in your doorway" (/try/:id) warps one image into the rectangle the
 * customer outlines on their own photo. That image has to *be* the leaf —
 * head-on, edge to edge, no wall, no architrave, no floor. The catalogue
 * photographs are none of those things: they are doors standing in rooms and
 * on showroom floors, and warping one whole would put our shop floor in
 * someone's hallway. Until 2026-08-20 that is exactly why every photographed
 * door reported `soon` and the feature only ever worked for the drawn doors —
 * which have now been removed, so without this script it would work for
 * nothing at all.
 *
 * Input is the four corners hand-marked per door in src/data/photoMap.ts.
 * Each quad is mapped back to a true rectangle, which crops the room away and
 * removes the camera's tilt in one operation, and the rectangle's real aspect
 * comes from `rectifyAspect` — the same Zhang & He solve the storefront uses
 * to measure a customer's door — so a leaf photographed at an angle comes out
 * with its true proportions rather than the foreshortened ones.
 *
 * ⚠️ This is deliberately a *second* image, never a replacement for the cover.
 * The cover keeps the room around the door, which is what makes it read as a
 * real door on a card; the leaf has no context at all and would look like a
 * swatch. Cards and PDP galleries are untouched by this script.
 *
 * The warp is the same arithmetic as src/lib/rectifyImage.ts, re-expressed
 * against raw pixel buffers because there is no DOM here. `homography.ts` and
 * `rectify.ts` are loaded through Vite's SSR loader for the same reason
 * build-sitemap.mjs does it: the source uses extensionless TS imports.
 *
 * Writes public/images/leaves/<id>.webp and src/data/leaves.gen.ts.
 * Run with `npm run leaves:build`. Both outputs are committed.
 */
import { createServer } from 'vite'
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const SRC_DIR = path.join(root, 'public/images/doors')
const OUT_DIR = path.join(root, 'public/images/leaves')
const MANIFEST = path.join(root, 'src/data/leaves.gen.ts')

/**
 * Long edge of the generated leaf. The source is the committed 960px web copy
 * — the raw photography is gitignored and never reaches this machine — so
 * asking for more than this only upscales; the leaf is a *portion* of a 960px
 * image, and most come out 400–600px wide before this cap does anything.
 */
const OUT_H = 1200

/** Supersample before the downscale — see rectifyImage.ts for why. */
const SUPERSAMPLE = 2

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } })

try {
  const { solveHomography } = await server.ssrLoadModule('/src/lib/homography.ts')
  const { rectifyAspect } = await server.ssrLoadModule('/src/lib/rectify.ts')
  const { LEAF_SOURCES } = await server.ssrLoadModule('/src/data/photoMap.ts')

  await mkdir(OUT_DIR, { recursive: true })
  const manifest = []

  for (const { id, image, leaf } of LEAF_SOURCES) {
    const file = path.join(SRC_DIR, `${image}-960.webp`)
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

    const quad = leaf.quad.map(([fx, fy]) => ({ x: fx * info.width, y: fy * info.height }))

    /* True proportions, not the foreshortened ones the photo shows. A frontal
       shot falls back to the outline's shape in the image, which is the right
       answer there — see rectifyAspect. */
    const rect = rectifyAspect(quad, info.width, info.height)
    if (!rect) throw new Error(`${id}: those corners (${image}) do not form a usable rectangle`)

    const outH = OUT_H
    const outW = Math.max(1, Math.round(outH * rect.ratio))
    const bigW = outW * SUPERSAMPLE
    const bigH = outH * SUPERSAMPLE

    /* Destination rectangle → the marked quad, then sampled backwards, so each
       output pixel asks "where in the photo did I come from?" */
    const h = solveHomography(
      [
        { x: 0, y: 0 },
        { x: bigW, y: 0 },
        { x: bigW, y: bigH },
        { x: 0, y: bigH },
      ],
      quad,
    )
    if (!h) throw new Error(`${id}: homography failed`)

    const out = Buffer.alloc(bigW * bigH * 4)
    const { width: sw, height: sh } = info
    for (let y = 0; y < bigH; y++) {
      for (let x = 0; x < bigW; x++) {
        const cx = x + 0.5
        const cy = y + 0.5
        const wq = h[6] * cx + h[7] * cy + h[8]
        const o = (y * bigW + x) * 4
        if (wq === 0) continue
        const u = (h[0] * cx + h[1] * cy + h[2]) / wq
        const v = (h[3] * cx + h[4] * cy + h[5]) / wq
        if (u < 0 || v < 0 || u >= sw || v >= sh) continue
        // Bilinear — nearest-neighbour stair-steps the near-vertical edges,
        // which is most of what a door is.
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
          const top = data[i00 + c] + (data[i10 + c] - data[i00 + c]) * fx
          const bot = data[i01 + c] + (data[i11 + c] - data[i01 + c]) * fx
          out[o + c] = top + (bot - top) * fy
        }
      }
    }

    let pipe = sharp(out, { raw: { width: bigW, height: bigH, channels: 4 } })
    // A mirrored leaf is still a truthful picture of the design; the site's
    // one hinge is on the left, so a right-hung door is photographed backwards.
    if (leaf.flip) pipe = pipe.flop()
    const base = await pipe.resize(outW, outH).png().toBuffer()

    /* One file, at the leaf's own size. Unlike a catalogue photo this is never
       laid out small — /try warps it across a doorway on a full-screen stage —
       and it comes out 380–650px wide, so a responsive ladder would be two
       copies of the same picture. */
    await sharp(base).resize(outW, outH).webp({ quality: 84 }).toFile(path.join(OUT_DIR, `${id}.webp`))

    manifest.push({ id, w: outW, h: outH, ratio: rect.ratio, fromPerspective: rect.fromPerspective, image })
    console.log(
      `  ${id.padEnd(26)} ${image}  ${outW}×${outH}  ratio ${rect.ratio.toFixed(3)}` +
        `  ${rect.fromPerspective ? 'perspective' : 'frontal'}${leaf.flip ? '  flipped' : ''}`,
    )
  }

  const body = manifest
    .map(
      (m) =>
        `  '${m.id}': { src: '/images/leaves/${m.id}.webp', w: ${m.w}, h: ${m.h} },` +
        ` // ${m.image}, ${m.fromPerspective ? 'perspective-corrected' : 'frontal'}`,
    )
    .join('\n')

  await writeFile(
    MANIFEST,
    `/**
 * GENERATED by scripts/build-leaves.mjs — do not edit by hand.
 *
 * The door leaf cut out of each catalogue photograph and squared up: no wall,
 * no architrave, no camera tilt. This is the only image "see it in your
 * doorway" can warp into a customer's photo. Corners are marked by hand in
 * photoMap.ts; run \`npm run leaves:build\` after changing one.
 *
 * \`w\`/\`h\` are the generated leaf's own pixels, and their ratio is the door's
 * *true* proportions rather than the foreshortened ones in the photo — which
 * is what stops an angled shot from arriving in the doorway stretched.
 */
export interface LeafImage {
  src: string
  w: number
  h: number
}

export const LEAF_IMAGES: Record<string, LeafImage> = {
${body}
}
`,
    'utf8',
  )
  console.log(`\n${manifest.length} leaves → public/images/leaves/ + src/data/leaves.gen.ts`)
} finally {
  await server.close()
}
