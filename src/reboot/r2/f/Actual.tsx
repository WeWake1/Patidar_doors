// PROTOTYPE round 2 · F "Actual size" (wild, deadpan). An eight-foot teak door laid down the page at its real size,
// in the screen's own millimetres, so scrolling down it takes as long as a door is tall. A yellow tape runs down
// the left edge from the floor up, captions sit at their real heights, and a small map says where on the door
// you are. Nothing moves by itself: it is a very tall picture and plain scrolling, so phones get exactly what
// computers get. Browsers do not say how big a CSS pixel is, so the scale is a guess by kind of device; "Not
// actual size?" lets you match a bank card (ISO/IEC 7810 ID-1, 85.6 x 53.98 mm) and remembers it here.
// Renders: tools/render/r2/actual.py (strip bands + map).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Foot, Header, Visit } from '../Shell'
import './f.css'

const DIR = '/reboot/frames/r2/f'
const CARD: [number, number] = [85.6, 53.98]
const PPM_KEY = 'rb-actual-ppm'

interface Strip {
  ppm: number
  x_mm: [number, number]
  top_mm: number
  band_mm: number
  count: number
  door: { top: number; head_top: number; lever: [number, number]; keyhole: [number, number]; rose_x: number }
}

function guessPpm() {
  try {
    const v = Number(localStorage.getItem(PPM_KEY))
    if (v > 2 && v < 12) return v
  } catch {
    /* private mode: guess */
  }
  const coarse = matchMedia('(pointer: coarse)').matches
  const short = Math.min(screen.width, screen.height)
  if (coarse && short < 600) return 6.0 // phones: 360-430 CSS px across about 62-70 mm of glass
  if (coarse) return 5.0 // tablets
  return screen.width >= 1800 ? 4.0 : 4.7 // big monitors vs laptops at their default scaling
}

const ftin = (mm: number) => {
  const inch = Math.max(0, Math.round(mm / 25.4))
  return `${Math.floor(inch / 12)}′ ${inch % 12}″`
}

// deadpan captions at their real heights (mm above the floor)
const NOTES: { z: number; text: string; phone?: string }[] = [
  { z: 2446, text: 'The top of the door. Eight feet off the floor.' },
  { z: 2150, text: 'Seven feet. Plenty of doors stop about here. Ours are made to measure, so this one doesn’t.' },
  { z: 1560, text: 'Roughly where your eyes are, standing in front of it.' },
  { z: 1219, text: 'Halfway. Four feet of door still to go.' },
  {
    z: 1150,
    text: 'The handle, at actual size.',
    phone: 'The handle, at actual size. It’s wider than your screen.',
  },
  { z: 930, text: 'The keyhole.' },
  { z: 420, text: 'Nearly there.' },
  { z: 70, text: 'The floor. That was one door.' },
]

export function Actual() {
  const [ppm, setPpm] = useState(guessPpm)
  const [vw, setVw] = useState(() => window.innerWidth)
  const [strip, setStrip] = useState<Strip | null>(null)
  const [calib, setCalib] = useState(false)
  const door = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLSpanElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const map = useRef<HTMLDivElement>(null)

  // the phone set is a 150 mm strip at 12 px/mm; anything wider than that needs the 710 mm set
  const set = vw / ppm <= 130 ? 'phone' : 'desk'
  const phone = set === 'phone'
  useEffect(() => {
    let live = true
    fetch(`${DIR}/${set}/strip.json`)
      .then((r) => r.json())
      .then((j: Strip) => live && setStrip(j))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [set])
  useEffect(() => {
    const on = () => setVw(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const L = useMemo(() => {
    if (!strip) return null
    // start just above the frame, so the first screen already has the top of the door in it (a phone shows
    // about 140 mm of door per screen); stop at the floor line
    const start = strip.door.head_top + (phone ? 34 : 64)
    const cx = phone ? 378 : 330 // what sits in the middle of the screen: the rose / the stile's inner edge
    return { start, cx, h: (start + 8) * ppm, y: (z: number) => (start - z) * ppm }
  }, [strip, ppm, phone])

  // the map: where the screen is on the whole door, and how high up that is
  useEffect(() => {
    if (!L || !strip) return
    let raf = 0
    const MAP_X: [number, number] = [-760, 760]
    const MAP_Z: [number, number] = [-60, strip.top_mm]
    const tick = () => {
      raf = 0
      const el = door.current
      const b = box.current
      if (!el || !b || !map.current) return
      const r = el.getBoundingClientRect()
      const zTop = L.start - -r.top / ppm
      const zBot = zTop - window.innerHeight / ppm
      const half = window.innerWidth / 2 / ppm
      const fx = (x: number) => ((x - MAP_X[0]) / (MAP_X[1] - MAP_X[0])) * 100
      const fz = (z: number) => ((MAP_Z[1] - z) / (MAP_Z[1] - MAP_Z[0])) * 100
      b.style.left = `${fx(L.cx - half)}%`
      b.style.width = `${fx(L.cx + half) - fx(L.cx - half)}%`
      b.style.top = `${fz(Math.min(zTop, MAP_Z[1]))}%`
      b.style.height = `${Math.max(fz(Math.max(zBot, MAP_Z[0])) - fz(Math.min(zTop, MAP_Z[1])), 1)}%`
      if (readout.current) readout.current.textContent = ftin(Math.min(Math.max((zTop + zBot) / 2, 0), strip.door.top))
      map.current.classList.toggle('is-on', r.top < window.innerHeight * 0.3 && r.bottom > window.innerHeight * 0.5)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [L, strip, ppm])

  const saveCalib = (v: number) => {
    setPpm(v)
    try {
      localStorage.setItem(PPM_KEY, String(v))
    } catch {
      /* fine: it lasts until reload */
    }
  }

  const inches = L ? Math.floor(L.start / 25.4) : 0
  return (
    <div className="rb vf" id="top" style={{ ['--ppm' as string]: `${ppm}px` }}>
      <Header>
        <button type="button" className="vf-link" onClick={() => setCalib(true)}>
          Not actual size?
        </button>
        <a className="vf-link" href="#vf-end">
          Skip the door ↓
        </a>
      </Header>
      <section className="vf-hero" aria-labelledby="vf-h">
        <div
          className="vf-door"
          ref={door}
          style={{ height: L ? `${L.h}px` : '300vh' }}
          aria-label="An eight-foot teak panel door, drawn at its real size from the top of its frame to the floor."
        >
          {strip &&
            L &&
            Array.from({ length: strip.count }, (_, b) => {
              const zt = strip.top_mm - b * strip.band_mm
              if (zt - strip.band_mm > L.start) return null
              return (
                <img
                  key={b}
                  className="vf-band"
                  src={`${DIR}/${set}/${String(b).padStart(2, '0')}.webp`}
                  alt=""
                  loading={b < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{
                    top: `${L.y(zt)}px`,
                    height: `${strip.band_mm * ppm}px`,
                    width: `${(strip.x_mm[1] - strip.x_mm[0]) * ppm}px`,
                    left: `calc(50% - ${(L.cx - strip.x_mm[0]) * ppm}px)`,
                  }}
                />
              )
            })}
          {L && (
            <div className="vf-tape" style={{ height: `${L.start * ppm}px` }} aria-hidden="true">
              {Array.from({ length: inches }, (_, i) => i + 1).map((n) => (
                <span
                  key={n}
                  className={`vf-tick${n % 12 === 0 ? ' is-foot' : ''}${n % 16 === 0 ? ' is-stud' : ''}`}
                  style={{ bottom: `${n * 25.4 * ppm}px` }}
                >
                  {n % 12 === 0 ? `${n / 12}F` : n}
                </span>
              ))}
            </div>
          )}
          {L &&
            NOTES.map((n) => (
              <p key={n.z} className="vf-note" style={{ top: `${L.y(n.z)}px` }}>
                <span className="vf-note__h">{ftin(n.z)}</span>
                {phone && n.phone ? n.phone : n.text}
              </p>
            ))}
          <div className="vf-title" style={L ? { top: `${L.y(L.start) + 84}px` } : undefined}>
            <h1 id="vf-h">This is a door at actual size.</h1>
            <p>It’s eight feet tall, so scroll down it.</p>
            <button type="button" className="vf-link vf-title__calib" onClick={() => setCalib(true)}>
              Not actual size on your screen?
            </button>
          </div>
        </div>
      </section>
      <div className="vf-map" ref={map} aria-hidden="true">
        <img src={`${DIR}/map.webp`} alt="" width={300} height={592} />
        <span className="vf-map__box" ref={box} />
        <span className="vf-map__read" ref={readout} />
      </div>
      <Visit
        id="vf-end"
        title="That was one door."
        lead="A screen only ever shows you part of one. Come and see whole doors, and have yours made to measure."
      />
      <Foot note={`scale ${ppm.toFixed(2)} px per mm`} />
      {calib && (
        <div className="vf-calib" role="dialog" aria-modal="true" aria-labelledby="vf-calib-h">
          <h2 id="vf-calib-h">Make it actual size</h2>
          <p>Hold a bank card flat against the screen in the box’s corner, and slide until the box matches the card.</p>
          <div className="vf-card" style={{ width: `${CARD[0] * ppm}px`, height: `${CARD[1] * ppm}px` }} />
          <input
            type="range"
            min={3}
            max={9}
            step={0.01}
            value={ppm}
            onChange={(e) => saveCalib(Number(e.target.value))}
            aria-label="Pixels per millimetre"
          />
          <button type="button" className="rb-btn" onClick={() => setCalib(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  )
}
