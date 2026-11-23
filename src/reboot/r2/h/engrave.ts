// PROTOTYPE round 2 · H "Your name here": engraves a name into the rendered brass plate. Brass nameplates are cut
// and filled with black enamel, so the letters show the second render (the plate's face as black enamel, same
// camera) through the shape of the text, and each letter's cut wall is drawn from the render's own light: the
// wall facing the light catches it, the one facing away is in shadow. Canvas 2D only.

export interface PlateData {
  size: [number, number]
  quad: [number, number][] // the plate face, clockwise from the top-left, px
  plate_mm: [number, number]
  light: [number, number] // toward the light, on screen (y down)
}
export type Style = 'serif' | 'caps'

const FONTS: Record<Style, { font: (px: number) => string; track: number; upper: boolean }> = {
  serif: { font: (px) => `400 ${px}px Gloock, Georgia, serif`, track: 0.01, upper: false },
  caps: { font: (px) => `600 ${px}px "Hanken Grotesk", system-ui, sans-serif`, track: 0.16, upper: true },
}

export function fontsReady() {
  return Promise.all([
    document.fonts.load('400 40px Gloock'),
    document.fonts.load('600 40px "Hanken Grotesk"'),
    document.fonts.load('500 20px "Instrument Sans"'),
  ]).catch(() => [])
}

/** Draw the plate with `text` engraved into `ctx` (a canvas the size of the render). */
export function engrave(
  ctx: CanvasRenderingContext2D,
  base: HTMLImageElement,
  enamel: HTMLImageElement,
  plate: PlateData,
  text: string,
  style: Style,
) {
  const [W, H] = plate.size
  ctx.drawImage(base, 0, 0, W, H)
  const xs = plate.quad.map((p) => p[0])
  const ys = plate.quad.map((p) => p[1])
  const x0 = Math.floor(Math.min(...xs))
  const y0 = Math.floor(Math.min(...ys))
  const pw = Math.ceil(Math.max(...xs)) - x0
  const ph = Math.ceil(Math.max(...ys)) - y0
  const ppm = pw / plate.plate_mm[0]
  const f = FONTS[style]
  const s = f.upper ? text.toUpperCase() : text
  // fit: inside 22 mm of each end (the screw caps) and no taller than 38% of the plate
  const room = pw - 2 * 22 * ppm
  const mask = document.createElement('canvas')
  mask.width = pw
  mask.height = ph
  const m = mask.getContext('2d')!
  let px = ph * 0.42
  const widthAt = (size: number) => {
    m.font = f.font(size)
    let w = 0
    for (const ch of s) w += m.measureText(ch).width + f.track * size
    return w - f.track * size
  }
  const w0 = widthAt(px)
  if (w0 > room) px *= room / w0
  const tw = widthAt(px)
  m.font = f.font(px)
  m.fillStyle = '#fff'
  m.textBaseline = 'alphabetic'
  // centre on the cap height, not the em box
  const metric = m.measureText(f.upper ? 'H' : s)
  const asc = metric.actualBoundingBoxAscent
  const desc = f.upper ? 0 : metric.actualBoundingBoxDescent
  let x = (pw - tw) / 2
  const y = ph / 2 + (asc - desc) / 2
  for (const ch of s) {
    m.fillText(ch, x, y)
    x += m.measureText(ch).width + f.track * px
  }
  // the enamel, through the letters
  const cut = document.createElement('canvas')
  cut.width = pw
  cut.height = ph
  const c = cut.getContext('2d')!
  c.drawImage(enamel, x0, y0, pw, ph, 0, 0, pw, ph)
  c.globalCompositeOperation = 'destination-in'
  c.drawImage(mask, 0, 0)
  // the cut walls: a band just inside each letter's edge, lit or shaded by which way that edge faces
  const L = Math.hypot(plate.light[0], plate.light[1]) || 1
  const wall = Math.max(1, 0.55 * ppm)
  const lx = (plate.light[0] / L) * wall
  const ly = (plate.light[1] / L) * wall
  const band = (dx: number, dy: number, fill: string) => {
    const b = document.createElement('canvas')
    b.width = pw
    b.height = ph
    const g = b.getContext('2d')!
    g.drawImage(mask, 0, 0)
    g.globalCompositeOperation = 'destination-out'
    g.drawImage(mask, dx, dy)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = fill
    g.fillRect(0, 0, pw, ph)
    c.globalCompositeOperation = 'source-over'
    c.drawImage(b, 0, 0)
  }
  band(-lx, -ly, 'rgba(0, 0, 0, 0.6)') // the edge on the light's side: its wall faces away, in shadow
  band(lx, ly, 'rgba(255, 226, 150, 0.9)') // the far edge: its wall faces the light and catches it
  ctx.drawImage(cut, x0, y0)
}
