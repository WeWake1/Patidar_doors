// PROTOTYPE round 1 · D "Into the grain" (wild). The film opens so close to polished teak that nobody can tell
// what it is, then pulls back about 175 times to a whole door standing alone, colour-blocked against lilac. A live
// readout says how wide the view is ("2.7 cm across" ... "4.7 m across"), from scale.json beside the frames.
// 96 frames by tools/render/r1/grain.py. True things in the captions: seasoned in Patidar's own yard, logs bought
// whole, three generations in timber (round 1 Q9).
import { useEffect, useRef, useState } from 'react'
import { config } from '../../../config'
import { beat, isWide, prefersReduced, runFilm, type FilmHandle } from '../../lib/film'
import { createSeq, frameUrls } from '../../lib/seq'
import { After, Header, WA } from '../Shell'
import './d.css'

const N = 96
const DIR = '/reboot/frames/r1/d'
const BEATS = [
  { a: 0, b: 0.24, h: 'This is teak.', p: 'Closer than anyone looks at a door.' },
  { a: 0.24, b: 0.5, h: 'Seasoned in our own yard,', p: 'so it stays straight.' },
  { a: 0.5, b: 0.77, h: 'Sawn from logs we buy whole.', p: 'Three generations in timber.' },
]

const fmt = (m: number) =>
  m < 0.1 ? `${(m * 100).toFixed(1)} cm` : m < 1 ? `${Math.round(m * 100)} cm` : `${m.toFixed(1)} m`

export function Grain() {
  const root = useRef<HTMLDivElement>(null)
  const film = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const caps = useRef<(HTMLDivElement | null)[]>([])
  const close = useRef<HTMLDivElement>(null)
  const handle = useRef<FilmHandle | null>(null)
  const [wide] = useState(isWide)
  const [still] = useState(prefersReduced)
  const [lit, setLit] = useState(0)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const rt = root.current
    const fm = film.current
    const st = stage.current
    const cv = canvas.current
    if (!rt || !fm || !st || !cv) return
    const set = wide ? 'desk' : 'phone'
    const seq = createSeq(cv, frameUrls(`${DIR}/${set}`, N), { focus: { x: 0.5, y: 0.5 } })
    let widths: number[] = []
    let p = still ? 1 : 0
    const paint = () => {
      const f = p * (N - 1)
      if (widths.length && readout.current) {
        const i = Math.floor(f)
        const j = Math.min(i + 1, widths.length - 1)
        const w = (widths[i] + (widths[j] - widths[i]) * (f - i)) * seq.visibleWidth()
        readout.current.textContent = fmt(w)
      }
      rt.classList.toggle('is-light', p > 0.7) // the lilac wall arrives: dark text from here on
    }
    fetch(`${DIR}/${set}/scale.json`)
      .then((r) => r.json())
      .then((j: { view_width_m: number[] }) => {
        widths = j.view_width_m
        paint()
      })
      .catch(() => {})
    if (still) {
      seq.ready.then(() => seq.show(N - 1))
      paint()
      return () => seq.destroy()
    }
    handle.current = runFilm({
      root: fm,
      watch: st,
      seq,
      duration: 7000,
      onProgress: (q) => {
        p = q
        paint()
        if (wide) {
          BEATS.forEach((bt, i) => {
            const el = caps.current[i]
            if (!el) return
            const v = beat(q, bt.a, bt.b)
            el.style.opacity = v.toFixed(3)
            el.style.transform = `translateY(${((1 - v) * 20).toFixed(1)}px)`
            el.style.visibility = v < 0.01 ? 'hidden' : 'visible'
          })
          const c = close.current
          if (c) {
            const v = beat(q, 0.8, 1.01)
            c.style.opacity = v.toFixed(3)
            c.style.transform = `translateY(${((1 - v) * 20).toFixed(1)}px)`
            c.style.visibility = v < 0.01 ? 'hidden' : 'visible'
          }
        } else {
          let k = 0
          BEATS.forEach((bt, i) => {
            if (q >= bt.a - 0.02) k = i
          })
          setLit(k)
        }
      },
      onStart: () => setEnded(false),
      onEnd: () => setEnded(true),
    })
    return () => {
      handle.current?.destroy()
      seq.destroy()
    }
  }, [wide, still])

  return (
    <div className={`rb vd${still ? ' is-still' : ''}`} id="top" ref={root}>
      <Header />
      <section className="vd-film" ref={film} aria-label="Into the grain">
        <div className="vd-stage" ref={stage}>
          <img
            className="vd-poster"
            src={`${DIR}/${wide ? 'desk' : 'phone'}/${still ? '095' : '000'}.webp`}
            alt="Polished teak seen from a few centimetres away: fine pores and grain lines."
          />
          <canvas ref={canvas} aria-hidden="true" />
          <p className="vd-scale" aria-live="off">
            <span className="vd-scale__k">This view is</span>
            <span className="vd-scale__n" ref={readout}>
              2.7 cm
            </span>
            <span className="vd-scale__k">across</span>
          </p>
          {wide && !still && (
            <div className="vd-caps">
              {BEATS.map((bt, i) => (
                <div
                  className="vd-cap"
                  key={bt.h}
                  ref={(el) => {
                    caps.current[i] = el
                  }}
                >
                  <h2>{bt.h}</h2>
                  <p>{bt.p}</p>
                </div>
              ))}
              <div className="vd-cap vd-cap--close" ref={close}>
                <h1>Come and touch it.</h1>
                <p>{config.hours} · Nagasandra, Tumkur Road, Bengaluru</p>
                <div className="vd-ctas">
                  <a className="rb-btn" href={config.mapsUrl}>
                    Directions
                  </a>
                  <a className="rb-btn rb-btn--quiet" href={WA}>
                    WhatsApp us
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
        {(!wide || still) && (
          <div className="vd-list">
            <ol>
              {BEATS.map((bt, i) => (
                <li key={bt.h} className={still || i === lit ? 'is-on' : ''}>
                  <strong>{bt.h}</strong> {bt.p}
                </li>
              ))}
            </ol>
            <h1 className="vd-close">Come and touch it.</h1>
            <div className="vd-ctas">
              <a className="rb-btn" href={config.mapsUrl}>
                Directions
              </a>
              <a className="rb-btn rb-btn--quiet" href={WA}>
                WhatsApp us
              </a>
              {!still && ended && (
                <button type="button" className="rb-btn rb-btn--quiet" onClick={() => handle.current?.replay()}>
                  Play again
                </button>
              )}
            </div>
          </div>
        )}
      </section>
      <After />
    </div>
  )
}
