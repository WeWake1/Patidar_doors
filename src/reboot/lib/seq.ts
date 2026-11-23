// PROTOTYPE (creative reboot): plays pre-rendered Blender frames on a <canvas>. The technique is Pallet Euro's
// round-5 player, rewritten here: frames load coarse-to-fine (the first, the last, every 8th, 4th, 2nd, then the
// rest) so scrubbing works almost at once; a fractional frame cross-fades its two neighbours; the picture covers
// the canvas around a focus point, so the subject stays in view at any shape.

export interface Seq {
  readonly count: number
  /** Draw a frame; a fraction cross-fades the two neighbours. */
  show(f: number): void
  /** Where a point of the rendered frame (0..1 across, 0..1 down) lands on the canvas (0..1). */
  map(x: number, y: number): { x: number; y: number }
  /** The share of the frame's width the canvas shows (cover-cropping hides the rest). */
  visibleWidth(): number
  /** Resolves once the first frame is on the canvas. */
  readonly ready: Promise<void>
  /** Resolves once every frame has loaded. */
  readonly done: Promise<void>
  destroy(): void
}

export const frameUrls = (dir: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${dir}/${String(i).padStart(3, '0')}.webp`)

interface Opts {
  focus?: { x: number; y: number }
  start?: number
  /** Runs after every draw (a second canvas can copy this one). */
  onDraw?: () => void
}

export function createSeq(canvas: HTMLCanvasElement, urls: string[], opts: Opts = {}): Seq {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('2d canvas unavailable')
  const focus = opts.focus ?? { x: 0.5, y: 0.5 }
  const count = urls.length
  const imgs: (HTMLImageElement | null)[] = Array.from({ length: count }, () => null)
  let current = Math.min(Math.max(opts.start ?? 0, 0), count - 1)
  let dead = false
  let crop = { sx: 0, sy: 0, sw: 1, sh: 1, iw: 1, ih: 1 }

  const order: number[] = []
  const push = (i: number) => {
    if (i >= 0 && i < count && !order.includes(i)) order.push(i)
  }
  push(Math.round(current))
  push(count - 1)
  for (const step of [8, 4, 2, 1]) for (let i = 0; i < count; i += step) push(i)

  const nearest = (f: number) => {
    for (let d = 0; d < count; d++) {
      const a = Math.round(f) - d
      const b = Math.round(f) + d
      if (a >= 0 && imgs[a]) return a
      if (b < count && imgs[b]) return b
    }
    return -1
  }

  const blit = (img: HTMLImageElement, alpha: number) => {
    const cw = canvas.width
    const ch = canvas.height
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    const s = Math.max(cw / iw, ch / ih)
    const sw = cw / s
    const sh = ch / s
    const sx = Math.min(Math.max(focus.x * iw - sw / 2, 0), iw - sw)
    const sy = Math.min(Math.max(focus.y * ih - sh / 2, 0), ih - sh)
    crop = { sx, sy, sw, sh, iw, ih }
    ctx.globalAlpha = alpha
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  }

  const show = (f: number) => {
    if (dead) return
    current = Math.min(Math.max(f, 0), count - 1)
    const i0 = Math.floor(current)
    const i1 = Math.min(i0 + 1, count - 1)
    const t = current - i0
    const a = imgs[i0]
    const b = imgs[i1]
    if (a && b) {
      blit(a, 1)
      if (t > 0.001 && i1 !== i0) blit(b, t)
    } else {
      const n = nearest(current)
      const img = n >= 0 ? imgs[n] : null
      if (img) blit(img, 1)
    }
    ctx.globalAlpha = 1
    opts.onDraw?.()
  }

  const map = (x: number, y: number) => ({
    x: (x * crop.iw - crop.sx) / crop.sw,
    y: (y * crop.ih - crop.sy) / crop.sh,
  })

  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(canvas.clientWidth * dpr)
    const h = Math.round(canvas.clientHeight * dpr)
    if (!w || !h) return
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    show(current)
  }
  const ro = new ResizeObserver(fit)
  ro.observe(canvas)

  let resolveReady: () => void = () => {}
  const ready = new Promise<void>((r) => {
    resolveReady = r
  })
  const done = (async () => {
    for (const i of order) {
      if (dead) return
      const img = new Image()
      img.decoding = 'async'
      img.src = urls[i]
      try {
        await img.decode()
      } catch {
        continue
      }
      imgs[i] = img
      if (Math.abs(i - current) < 1.5) show(current)
      if (i === order[0]) {
        show(current)
        canvas.classList.add('is-ready')
        resolveReady()
      }
    }
    resolveReady()
  })()
  fit()

  return {
    count,
    show,
    map,
    visibleWidth: () => crop.sw / crop.iw,
    ready,
    done,
    destroy() {
      dead = true
      ro.disconnect()
    },
  }
}
