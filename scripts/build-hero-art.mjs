/**
 * The keyhole hero's three non-photographic door textures, as tiny PNGs:
 * the lit opening behind a leaf (`kt-gap`), the edge shade a leaf takes as it
 * turns from the light (`kt-shade`) and the jamb it hangs in (`kt-jamb`).
 *
 * ⚠️ **They are images on purpose, and they replace three CSS gradients that
 * were, measured, the most expensive pixels on the site.** Everything inside a
 * tunnel door is now an `<img>` with `will-change: transform`, which Chrome
 * composites as a *directly composited image*: the layer's texture IS the
 * decoded image at its own resolution, and the GPU scales it to wherever the
 * door is — no tiles, no raster, nothing that has to be redone as the door
 * grows 30× on its way past the camera. A CSS gradient on the same box is a
 * picture layer: rasterised into tiles at device resolution, re-rasterised at
 * new scales, and on a 1440px phone one door's glow alone was 85 MB of tiles
 * mid-flight (see the note on `.ktun__door` in global.css).
 *
 * The gradients are drawn in *percentages of the box*, so a single PNG
 * stretched to any door's aspect reproduces exactly what the CSS produced —
 * a `radial-gradient(48% 44% …)` is an ellipse proportional to its box either
 * way. That is why one file serves every door and both breakpoints.
 *
 *   npm run art:build   →  public/images/hero/kt-gap.webp, kt-{shade,jamb}.png
 *
 * Run it only when a texture changes; the outputs are committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const OUT = new URL('../public/images/hero/', import.meta.url)
mkdirSync(OUT, { recursive: true })

/* The glow is the one of the three with real content, and it is the one that
   costs bytes: a smooth two-colour alpha ramp is the worst case for PNG (42 kB
   at 384×512) and a good one for lossy WebP with lossless alpha (24 kB at
   256×342, 15 at 192×256). 256×342 stretched to ~1000 CSS px is a bilinear
   texel every 4 px — no banding, and the hue is close to constant so lossy
   chroma has nothing to get wrong. */
const GAP_W = 256, GAP_H = 342
const gap = `<svg xmlns="http://www.w3.org/2000/svg" width="${GAP_W}" height="${GAP_H}" viewBox="0 0 ${GAP_W} ${GAP_H}">
  <defs>
    <!-- .ktun__gap's radial-gradient(48% 44% at 50% 46%, rgba(246,223,172,.54), rgba(176,130,64,.16) 46%, transparent 76%).
         Bounding-box units so it scales with the rect like the CSS did; the
         gradient's own radius is the 76% stop, so the CSS stops are re-based. -->
    <radialGradient id="g" cx="0.5" cy="0.46" r="0.48" gradientTransform="translate(0 0.46) scale(1 ${(0.44 / 0.48).toFixed(4)}) translate(0 -0.46)">
      <stop offset="0" stop-color="rgb(246,223,172)" stop-opacity="0.54"/>
      <stop offset="${(0.46 / 0.76).toFixed(4)}" stop-color="rgb(176,130,64)" stop-opacity="0.16"/>
      <stop offset="1" stop-color="rgb(176,130,64)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${GAP_W}" height="${GAP_H}" fill="url(#g)"/>
</svg>`

/* .ktun__shade's linear-gradient(90deg, rgba(8,5,2,.03), rgba(8,5,2,.5)):
   one row would do, but Chrome checks a directly composited image's scaled
   bounds land within a pixel of the layer's, and a 1-px-tall texture stretched
   to 1500 fails that by rounding — 8 rows is nothing and always passes. */
const shade = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="8" viewBox="0 0 256 8">
  <defs>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgb(8,5,2)" stop-opacity="0.03"/>
      <stop offset="1" stop-color="rgb(8,5,2)" stop-opacity="0.5"/>
    </linearGradient>
  </defs>
  <rect width="256" height="8" fill="url(#s)"/>
</svg>`

/* the jamb: --night, solid. The leaf covers its middle when closed and the gap
   glow sits over it when open, so the 18px that shows around the leaf is the
   ring the box-shadow used to draw. 8×8 for the same rounding reason. */
const jamb = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#241c13"/></svg>`

for (const [name, svg, ext] of [['kt-gap', gap, 'webp'], ['kt-shade', shade, 'png'], ['kt-jamb', jamb, 'png']]) {
  const img = sharp(Buffer.from(svg))
  const out = await (ext === 'webp'
    ? img.webp({ quality: 90, alphaQuality: 100 }).toBuffer()
    : img.png({ compressionLevel: 9, palette: false }).toBuffer())
  writeFileSync(new URL(`${name}.${ext}`, OUT), out)
  console.log(`hero art → ${name}.${ext} (${(out.length / 1024).toFixed(1)} kB)`)
}
