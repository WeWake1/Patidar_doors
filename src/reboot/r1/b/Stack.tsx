// PROTOTYPE round 1 · B "Four materials, one roof" (premium). A still life of one offcut of each thing Patidar
// sells: a rough-sawn teak plank, an 18 mm ply sheet with its layers showing, a white WPC board, a door corner
// sample with its core showing. Move across it (computers) or drag it (phones) and it turns; each layer carries a
// label to its section, riding the render through hotspots.json. 48 orbit frames by tools/render/r1/stack.py.
// True thing: timber, doors, plywood and WPC are sold under one roof (PRODUCT.md).
import { useEffect, useRef, useState } from 'react'
import { config } from '../../../config'
import { isWide, prefersReduced } from '../../lib/film'
import { createSeq, frameUrls } from '../../lib/seq'
import { After, Header, SECTIONS, WA } from '../Shell'
import './b.css'

const N = 48
const DIR = '/reboot/frames/r1/b'
const PINS = [
  { k: 'timbers', n: '01', name: 'Timbers', href: '/timbers' },
  { k: 'ply', n: '02', name: 'Ply', href: '/ply' },
  { k: 'wpc', n: '03', name: 'WPC', href: '/wpc' },
  { k: 'doors', n: '04', name: 'Doors', href: '/doors' },
] as const

export function Stack() {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const pins = useRef<(HTMLAnchorElement | null)[]>([])
  const [wide] = useState(isWide)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    const st = stage.current
    const cv = canvas.current
    if (!st || !cv) return
    const set = wide ? 'desk' : 'phone'
    const seq = createSeq(cv, frameUrls(`${DIR}/${set}`, N), { start: Math.round((N - 1) / 2) })
    let hot: Record<string, [number, number][]> | null = null
    fetch(`${DIR}/${set}/hotspots.json`)
      .then((r) => r.json())
      .then((j: { layers: Record<string, [number, number][]> }) => {
        hot = j.layers
      })
      .catch(() => {})
    const reduce = prefersReduced()
    const mid = (N - 1) / 2
    let f = mid
    let target = mid
    let raf = 0
    let last = performance.now()
    let lastInput = -1e9
    let inView = true
    const place = () => {
      if (!hot) return
      const i = Math.floor(f)
      const j = Math.min(i + 1, N - 1)
      const t = f - i
      PINS.forEach((p, k) => {
        const el = pins.current[k]
        const arr = hot?.[p.k]
        if (!el || !arr) return
        const x = arr[i][0] + (arr[j][0] - arr[i][0]) * t
        const y = arr[i][1] + (arr[j][1] - arr[i][1]) * t
        const c = seq.map(x, y)
        el.style.left = `${(c.x * 100).toFixed(3)}%`
        el.style.top = `${(c.y * 100).toFixed(3)}%`
        el.style.opacity = '1'
        el.classList.toggle('is-flip', c.x > 0.8)
      })
    }
    const tick = (now: number) => {
      const dt = Math.min(now - last, 48)
      last = now
      if (!reduce && now - lastInput > 2600) target = mid + Math.sin(now / 2800) * N * 0.26 // idle: a slow turn
      f += (target - f) * (1 - Math.exp(-dt / 150))
      seq.show(f)
      place()
      raf = inView ? requestAnimationFrame(tick) : 0
    }
    const start = () => {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    const io = new IntersectionObserver((es) => {
      inView = es.some((e) => e.isIntersecting)
      if (inView) start()
    })
    io.observe(st)
    // computers: the pointer's position across the picture is the camera's position round the stack
    const hover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = st.getBoundingClientRect()
      target = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * (N - 1)
      lastInput = performance.now()
      setTouched(true)
    }
    // phones: drag it round
    let dragging = false
    let x0 = 0
    let t0 = 0
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      dragging = true
      x0 = e.clientX
      t0 = target
      lastInput = performance.now()
      setTouched(true)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      target = Math.min(Math.max(t0 - ((e.clientX - x0) / st.clientWidth) * N * 1.4, 0), N - 1)
      lastInput = performance.now()
    }
    const up = () => {
      dragging = false
    }
    st.addEventListener('pointermove', hover)
    st.addEventListener('pointerdown', down)
    st.addEventListener('pointermove', move)
    st.addEventListener('pointerup', up)
    st.addEventListener('pointercancel', up)
    start()
    return () => {
      io.disconnect()
      st.removeEventListener('pointermove', hover)
      st.removeEventListener('pointerdown', down)
      st.removeEventListener('pointermove', move)
      st.removeEventListener('pointerup', up)
      st.removeEventListener('pointercancel', up)
      cancelAnimationFrame(raf)
      seq.destroy()
    }
  }, [wide])

  return (
    <div className="rb vb" id="top">
      <Header />
      <section className="vb-hero">
        <div className="vb-stage" ref={stage}>
          <img
            className="vb-poster"
            src={`${DIR}/${wide ? 'desk' : 'phone'}/024.webp`}
            alt="A stack of four offcuts: a rough-sawn teak plank, a plywood sheet, a white WPC board and the corner of a teak door."
          />
          <canvas ref={canvas} aria-hidden="true" />
          {PINS.map((p, k) => (
            <a
              key={p.k}
              className={`vb-pin vb-pin--${p.k}`}
              href={p.href}
              ref={(el) => {
                pins.current[k] = el
              }}
            >
              <span className="vb-pin__label">
                <span>{p.n}</span> {p.name} <span aria-hidden="true">→</span>
              </span>
              <span className="vb-pin__line" aria-hidden="true" />
              <span className="vb-pin__dot" aria-hidden="true" />
            </a>
          ))}
          <p className={`vb-hint${touched ? ' is-gone' : ''}`} aria-hidden="true">
            {wide ? 'Move across it to turn it' : 'Drag to turn it'}
          </p>
        </div>
        <div className="vb-copy">
          <h1>
            Timber, doors, plywood and WPC. <em>Under one roof.</em>
          </h1>
          <p>
            Teak sawn in our own yard. Doors pressed and finished in our own factory, made to measure. Ply and WPC at
            the same counter in Nagasandra.
          </p>
          <div className="vb-ctas">
            <a className="rb-btn" href={config.mapsUrl}>
              Visit the store
            </a>
            <a className="rb-btn rb-btn--quiet" href={WA}>
              WhatsApp us
            </a>
          </div>
        </div>
        <ol className="vb-list">
          {SECTIONS.map((s, i) => (
            <li key={s.href}>
              <a href={s.href}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <strong>{s.name}</strong>
                <em>{s.what}</em>
              </a>
            </li>
          ))}
        </ol>
      </section>
      <After index={false} />
    </div>
  )
}
