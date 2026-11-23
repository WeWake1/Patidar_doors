// PROTOTYPE round 2 · G "Next door" (premium, product-led). Real catalogue doors leaning in a stack against a pale
// wall, fanned so the ones behind show a strip. Tap (or click, or swipe left) and the front door is pulled forward
// and laid down out of the picture; the stack settles and the next door is in front. Swipe right brings the last
// one back. It is the shop-floor way of looking at doors, and it shows the range, which round 1 never did.
// The doors are photographs (the catalogue's 17 leaf cut-outs, 12 of which are clean and door-shaped enough; all
// are still the placeholders found online), warped into a Blender render's blank faces frame by frame and lit by
// it: tools/render/r2/flip.py, stackGl.ts. Phones: the same, tap or swipe; it pulls one door by itself once as a
// hint. Reduced motion: a tap cuts straight to the next door.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { isWide, prefersReduced } from '../../lib/film'
import { knock } from '../e/knockAudio'
import { Foot, Header, Visit } from '../Shell'
import { createStackGl, type StackData, type StackGl } from './stackGl'
import './g.css'

const DIR = '/reboot/frames/r2/g'
const DOORS = [
  { id: 'architect-teak-door', name: 'Architect Teak Doors' },
  { id: 'membrane-door', name: 'Membrane Doors' },
  { id: 'burma-teak-door', name: 'Burma Teak Door' },
  { id: 'wpc-cnc-door', name: '28 mm CNC WPC Doors' },
  { id: 'honne-ab-door', name: 'Honne A & B Grade Doors' },
  { id: 'korean-membrane-door', name: 'Korean Membrane Doors' },
  { id: 'burma-border-teak-door', name: 'Burma Border Teak Door' },
  { id: 'microcoat-door', name: 'Lamination / MicroCoated Doors' },
  { id: 'gana-teak-polish-door', name: 'Gana Teak Polish Doors' },
  { id: 'primer-door', name: 'Primer Doors' },
  { id: 'mahagony-ab-door', name: 'Mahagony A & B Grade Doors' },
  { id: 'teak-osc-2nds', name: '2nds Teak OSC Doors' },
] as const
const LAND = 0.76 // where in the film the front door reaches the floor (flip.py: the fall ends at t = 0.78)
const MS = 1150

export function NextDoor() {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const ren = useRef<StackGl | null>(null)
  const photos = useRef<HTMLImageElement[]>([])
  const busy = useRef(false)
  const queued = useRef(0)
  const [wide] = useState(isWide)
  const [reduced] = useState(prefersReduced)
  const [head, setHead] = useState(0)
  const headRef = useRef(0)
  const [ready, setReady] = useState(false)
  const [touched, setTouched] = useState(false)
  const [sound, setSound] = useState(true)
  const soundRef = useRef(true)
  soundRef.current = sound
  const data = useRef<StackData | null>(null)
  const set = wide ? 'desk' : 'phone'

  const slots = (h: number) => [0, 1, 2, 3].map((s) => photos.current[(h + s) % DOORS.length] ?? null)

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let live = true
    photos.current = DOORS.map((d) => {
      const im = new Image()
      im.src = `/images/leaves/${d.id}.webp`
      return im
    })
    fetch(`${DIR}/${set}/corners.json`)
      .then((r) => r.json())
      .then(async (j: StackData) => {
        if (!live) return
        data.current = j
        const load = (src: string) => {
          const im = new Image()
          im.src = src
          return im
        }
        const n = String
        const plates = Array.from({ length: j.count }, (_, f) => load(`${DIR}/${set}/${n(f).padStart(3, '0')}.webp`))
        const masks = Array.from({ length: j.count }, (_, f) => load(`${DIR}/${set}/m${n(f).padStart(3, '0')}.webp`))
        try {
          ren.current = createStackGl(cv, j, plates, masks, wide ? [0.66, 0.5] : [0.5, 0.5])
        } catch {
          ren.current = null
        }
        const first = [plates[0], masks[0], ...slots(0)].filter(Boolean) as HTMLImageElement[]
        await Promise.all(first.map((im) => im.decode().catch(() => {})))
        if (!live) return
        ren.current?.draw(0, slots(0))
        await Promise.all([...plates, ...masks, ...photos.current].map((im) => im.decode().catch(() => {})))
        if (live) setReady(true)
      })
      .catch(() => {})
    const ro = new ResizeObserver(() => ren.current?.draw(0, slots(headRef.current)))
    ro.observe(cv)
    return () => {
      live = false
      ro.disconnect()
      ren.current?.destroy()
      ren.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, wide])

  const flip = useCallback(
    (dir: 1 | -1, quiet = false) => {
      const r = ren.current
      const d = data.current
      if (!r || !d) return
      if (busy.current) {
        queued.current = dir
        return
      }
      const N = d.count
      const step = (h: number) => (h + dir + DOORS.length) % DOORS.length
      if (reduced) {
        headRef.current = step(headRef.current)
        setHead(headRef.current)
        r.draw(0, slots(headRef.current))
        return
      }
      busy.current = true
      // backwards: put the photos one place back first, then run the film in reverse
      if (dir < 0) {
        headRef.current = step(headRef.current)
        setHead(headRef.current)
      }
      const h = headRef.current
      const t0 = performance.now()
      let landed = false
      const tick = (now: number) => {
        const t = Math.min((now - t0) / MS, 1)
        const p = dir > 0 ? t : 1 - t
        r.draw(Math.round(p * (N - 1)), slots(h))
        if (!landed && ((dir > 0 && p >= LAND) || (dir < 0 && t > 0.02))) {
          landed = true
          if (!quiet) {
            knock('timber', dir > 0 ? 0 : 0.2, soundRef.current)
            navigator.vibrate?.(18)
          }
        }
        if (t < 1) {
          requestAnimationFrame(tick)
          return
        }
        if (dir > 0) {
          headRef.current = step(headRef.current)
          setHead(headRef.current)
        }
        r.draw(0, slots(headRef.current))
        busy.current = false
        const q = queued.current
        queued.current = 0
        if (q) flip(q as 1 | -1)
      }
      requestAnimationFrame(tick)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduced],
  )

  // once, by itself, so it is plain that the stack moves
  useEffect(() => {
    if (!ready || reduced) return
    const id = window.setTimeout(() => {
      if (!touched) flip(1, true)
    }, 1400)
    return () => window.clearTimeout(id)
  }, [ready, reduced, touched, flip])

  const down = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    down.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = down.current
    down.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(e.clientY - s.y) > 30 && Math.abs(dx) < 30) return // a scroll, not a pull
    setTouched(true)
    flip(dx > 40 ? -1 : 1)
  }

  const cur = DOORS[head]
  return (
    <div className="rb vg" id="top">
      <Header />
      <section className="vg-hero" aria-labelledby="vg-h">
        <div
          className="vg-stage"
          ref={stage}
          role="button"
          tabIndex={0}
          aria-label="Pull the front door forward and see the next one"
          onPointerDown={onDown}
          onPointerUp={onUp}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setTouched(true)
              flip(1)
            }
          }}
        >
          <canvas ref={canvas} aria-hidden="true" />
        </div>
        <div className="vg-copy">
          <h1 id="vg-h">Next door.</h1>
          <p>
            {wide ? 'Click' : 'Tap'} the stack to pull the front one forward{wide ? '' : ', or swipe'}. One at a
            time, standing up, the way you look at doors in a shop.
          </p>
        </div>
        <div className="vg-now" aria-live="polite">
          <span className="vg-now__n">
            {String(head + 1).padStart(2, '0')} / {DOORS.length}
          </span>
          <a className="vg-now__name" href={`/product/${cur.id}`}>
            {cur.name} <span aria-hidden="true">→</span>
          </a>
          <span className="vg-now__ctl">
            <button type="button" onClick={() => (setTouched(true), flip(-1))} aria-label="The last door back">
              ←
            </button>
            <button type="button" onClick={() => (setTouched(true), flip(1))} aria-label="Next door">
              →
            </button>
            <button type="button" className="vg-sound" aria-pressed={sound} onClick={() => setSound((s) => !s)}>
              Sound {sound ? 'on' : 'off'}
            </button>
          </span>
        </div>
      </section>
      <Visit
        id="vg-visit"
        title="Come and look through the rest."
        lead="Every door here is made to measure for your doorway. Send us the ones you liked and come and see them."
      />
      <Foot note="door photos are the catalogue’s current placeholders" />
    </div>
  )
}
