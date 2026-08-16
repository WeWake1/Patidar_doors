/**
 * The on-screen leaf, turned into pixels the exporter can sample.
 *
 * It serialises the **live** <svg> node rather than re-rendering the component,
 * for two reasons. `react-dom/server` would be ~15–20 kB gz of the wrong thing
 * in a client bundle; and a fresh render allocates a new uid, so the exported
 * door would carry different gradient ids than the one the customer is looking
 * at. Cloning what is already on screen means the saved picture is provably the
 * picture they approved.
 */

const RASTER_TIMEOUT_MS = 4000

export class RasterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RasterError'
  }
}

/**
 * Rasterise `live` at `w × h` CSS pixels.
 *
 * The caller passes the *destination* size so the grain is sampled at roughly
 * the resolution it will be seen at — feTurbulence is expensive, and a leaf
 * rasterised far above its final size costs seconds on a phone for detail that
 * is then thrown away.
 */
export async function rasterizeDoor(live: SVGSVGElement, w: number, h: number): Promise<HTMLImageElement> {
  const svg = live.cloneNode(true) as SVGSVGElement

  /* Inline the shared filters. Without this every wood door comes out as flat
     un-grained stripes — see DoorArtDefs. */
  const defs = document.getElementById('dw-defs')
  const shared = defs?.querySelector('defs')
  if (shared) svg.insertBefore(shared.cloneNode(true), svg.firstChild)

  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  /* ⚠️ Explicit width/height are mandatory. Safari will not take an intrinsic
     size from `viewBox` alone when the SVG is the source of an <img>, and
     without them the draw comes back blank or at a default 300×150. */
  svg.setAttribute('width', String(Math.round(w)))
  svg.setAttribute('height', String(Math.round(h)))
  svg.removeAttribute('class')

  const markup = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    return await withTimeout(loadImage(url), RASTER_TIMEOUT_MS)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // The SVG has no external references — every fill is a literal hex, there
    // are no webfonts and no <image href> — so the canvas it lands on is NOT
    // tainted and toBlob() works. Re-check that if artwork ever gains a texture.
    img.onload = () => resolve(img)
    img.onerror = () => reject(new RasterError('the door artwork could not be drawn'))
    img.src = url
  })
}

/**
 * feTurbulence in an <img> has historically been slow-to-flaky in Safari, and
 * a hung promise here would leave the customer looking at a disabled button
 * forever. Failing loudly lets the UI offer them WhatsApp instead.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new RasterError('the door artwork took too long to draw')), ms)
    p.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}
