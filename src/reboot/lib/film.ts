// PROTOTYPE (creative reboot): a Blender film on the page.
// Computers (wider than 900 px): the section is tall and its stage sticks; the scroll position picks the frame,
// eased a little so a flick glides. Phones: no scroll-driven or pinned motion (decisions, round 1 Q11): when the
// picture is mostly in view, the film plays once by itself and holds its last frame; replay() plays it again.
// Reduced motion: the last frame, and nothing moves.
import type { Seq } from './seq'

export const isWide = () => window.matchMedia('(min-width: 901px)').matches
export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export interface FilmHandle {
  replay(): void
  destroy(): void
}

interface FilmOpts {
  /** The tall section (computers) or the block (phones). */
  root: HTMLElement
  /** What must be mostly in view before a phone plays the film. */
  watch: HTMLElement
  seq: Seq
  /** Share of the scroll after the film has ended (room for a closing move). */
  tail?: number
  /** Phone playback, ms. */
  duration?: number
  /** p: the film, 0..1. raw: the whole section's scroll, 0..1 (on phones the two are the same). */
  onProgress(p: number, raw: number): void
  onStart?(): void
  onEnd?(): void
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

export function runFilm(o: FilmOpts): FilmHandle {
  const n = o.seq.count
  const tail = o.tail ?? 0
  let raf = 0
  let cur = 0
  let alive = true
  const cleanups: (() => void)[] = []

  if (prefersReduced()) {
    o.seq.ready.then(() => {
      o.seq.show(n - 1)
      o.onProgress(1, 1)
      o.onEnd?.()
    })
    o.onProgress(1, 1)
    return { replay() {}, destroy() {} }
  }

  if (isWide()) {
    let last = 0
    let lastRaw = -1
    const raw = () => {
      const r = o.root.getBoundingClientRect()
      const span = r.height - window.innerHeight
      return span > 0 ? Math.min(Math.max(-r.top / span, 0), 1) : 0
    }
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64)
      last = now
      const p = raw()
      const target = Math.min(p / (1 - tail), 1) * (n - 1)
      cur += (target - cur) * (1 - Math.exp(-dt / 90))
      if (Math.abs(target - cur) < 0.01) cur = target
      o.seq.show(cur)
      o.onProgress(cur / (n - 1), p)
      const moving = cur !== target || p !== lastRaw
      lastRaw = p
      raf = moving && alive ? requestAnimationFrame(tick) : 0
    }
    const kick = () => {
      if (!raf && alive) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    cleanups.push(() => {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
    })
    o.seq.ready.then(kick)
    kick()
    return {
      replay() {},
      destroy() {
        alive = false
        cancelAnimationFrame(raf)
        cleanups.forEach((c) => c())
      },
    }
  }

  // phones: play once by itself when mostly in view
  const dur = o.duration ?? 6000
  let playing = false
  const play = () => {
    if (playing || !alive) return
    playing = true
    o.onStart?.()
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - t0) / dur, 1)
      const e = easeInOut(t)
      cur = e * (n - 1)
      o.seq.show(cur)
      o.onProgress(e, e)
      if (t < 1 && alive) raf = requestAnimationFrame(step)
      else {
        playing = false
        o.onEnd?.()
      }
    }
    raf = requestAnimationFrame(step)
  }
  o.onProgress(0, 0)
  let played = false
  const io = new IntersectionObserver(
    (es) => {
      if (!played && es.some((e) => e.intersectionRatio > 0.6)) {
        played = true
        o.seq.done.then(play)
      }
    },
    { threshold: [0, 0.6, 1] },
  )
  io.observe(o.watch)
  return {
    replay: play,
    destroy() {
      alive = false
      io.disconnect()
      cancelAnimationFrame(raf)
    },
  }
}

/** Fade a caption in over [a, a + f] and out over [b - f, b] of a 0..1 progress. */
export function beat(p: number, a: number, b: number, f = 0.03) {
  const sm = (lo: number, hi: number, x: number) => {
    const t = Math.min(Math.max((x - lo) / (hi - lo), 0), 1)
    return t * t * (3 - 2 * t)
  }
  return (a <= 0 ? 1 : sm(a, a + f, p)) * (b >= 1 ? 1 : 1 - sm(b - f, b, p))
}
