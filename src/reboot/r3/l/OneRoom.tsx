// PROTOTYPE round 3 · L "One room" (Blender + live photographs). A calm room in morning sun: white walls, an oak
// floor, an armchair, a plant, the light lying across the floor and up the wall. The camera pushes in and drifts
// back, very slowly, all the time. The door in the room is any of the catalogue's: every few seconds it changes,
// a crossfade in the room's own light, or you pick one from the row below. Renders: tools/render/r3/room.py; the
// photo is warped into the render's blank door and lit by it (roomGl.ts). Phones: the same. Reduced motion: the
// camera holds still and the door only changes when you pick one.
import { useEffect, useRef, useState } from 'react'
import { isWide, prefersReduced } from '../../lib/film'
import { CATALOGUE } from '../doors3d'
import { Foot, Header, LANDMARK, Visit } from '../Shell'
import { createRoomGl, type RoomData, type RoomGl } from './roomGl'
import '../r3.css'
import './l.css'

const DIR = '/reboot/frames/r3/l'
const PUSH_S = 11 // one way; then back
const HOLD_MS = 4800
const FADE_MS = 1100

export function OneRoom() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const ren = useRef<RoomGl | null>(null)
  const photos = useRef<HTMLImageElement[]>([])
  const fade = useRef({ from: 0, to: 0, at: -1e9 })
  const picked = useRef(-1e9)
  const [wide] = useState(isWide)
  const [reduced] = useState(prefersReduced)
  const [cur, setCur] = useState(0)
  const set = wide ? 'desk' : 'phone'

  const choose = (i: number, byHand: boolean) => {
    const f = fade.current
    if (i === f.to) return
    fade.current = { from: f.to, to: i, at: performance.now() }
    if (byHand) picked.current = performance.now()
    setCur(i)
  }

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let live = true
    let raf = 0
    photos.current = CATALOGUE.map((d) => {
      const im = new Image()
      im.src = `/images/leaves/${d.id}.webp`
      return im
    })
    fetch(`${DIR}/${set}/corners.json`)
      .then((r) => r.json())
      .then((j: RoomData) => {
        if (!live) return
        const pad = (f: number) => String(f).padStart(3, '0')
        const load = (src: string) => {
          const im = new Image()
          im.src = src
          return im
        }
        const plates = Array.from({ length: j.count }, (_, f) => load(`${DIR}/${set}/${pad(f)}.webp`))
        const masks = Array.from({ length: j.count }, (_, f) => load(`${DIR}/${set}/m${pad(f)}.webp`))
        try {
          ren.current = createRoomGl(cv, j, plates, masks, wide ? [0.4, 0.5] : [0.5, 0.68])
        } catch {
          ren.current = null
        }
        const t0 = performance.now()
        let lastAuto = t0
        const tick = (now: number) => {
          raf = 0
          if (!live) return
          const t = (now - t0) / 1000
          // the push: in and back, eased at both ends
          const ph = reduced ? 0 : (1 - Math.cos((t / PUSH_S) * Math.PI)) / 2
          const f = ph * (j.count - 1)
          // the door: every HOLD_MS, unless someone picked one in the last 20 s
          if (!reduced && now - lastAuto > HOLD_MS && now - picked.current > 20000) {
            lastAuto = now
            choose((fade.current.to + 1) % CATALOGUE.length, false)
          }
          const fd = fade.current
          const m = Math.min((now - fd.at) / FADE_MS, 1)
          const mix = m * m * (3 - 2 * m)
          ren.current?.draw(f, photos.current[fd.from], photos.current[fd.to], mix)
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      })
      .catch(() => {})
    return () => {
      live = false
      cancelAnimationFrame(raf)
      ren.current?.destroy()
      ren.current = null
    }
    // choose() only touches refs and state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, wide, reduced])

  return (
    <div className="rb r3 vl" id="top">
      <Header />
      <section className="vl-hero" aria-labelledby="vl-h">
        <canvas ref={canvas} aria-label={`A calm white room in morning sun; in its door, ${CATALOGUE[cur].name}.`} />
        <div className="vl-copy">
          <h1 id="vl-h" className="r3-title">
            The door makes the room.
          </h1>
          <p className="r3-sub">Twelve from our catalogue, one room. Each made to measure for yours.</p>
        </div>
        <div className="vl-pick">
          <a className="vl-name" href={`/product/${CATALOGUE[cur].id}`}>
            {CATALOGUE[cur].name} <span aria-hidden="true">→</span>
          </a>
          <div className="vl-thumbs" role="radiogroup" aria-label="Choose a door">
            {CATALOGUE.map((d, i) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={i === cur}
                aria-label={d.name}
                onClick={() => choose(i, true)}
              >
                <img src={`/images/leaves/${d.id}.webp`} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </section>
      <Visit title="Come and see them in daylight." lead={`${LANDMARK}.`} />
      <Foot />
    </div>
  )
}
