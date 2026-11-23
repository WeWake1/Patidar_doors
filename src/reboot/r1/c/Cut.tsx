// PROTOTYPE round 1 · C "The first cut" (wild). A teak log, end-on; the band saw runs its length, comes out through
// the near face and splits the rings; the halves fall open like a book (bookmatched). Then the page itself is
// sawn: the stage splits along the rendered kerf line and the halves slide apart onto the message.
// 60 frames by tools/render/r1/cut.py; the kerf's screen position is printed by that script (SPLIT_SCREEN).
// True thing: logs are bought whole and sawn in Patidar's own yard (round 1 Q9).
import { useEffect, useRef, useState } from 'react'
import { config } from '../../../config'
import { beat, isWide, prefersReduced, runFilm, type FilmHandle } from '../../lib/film'
import { createSeq, frameUrls } from '../../lib/seq'
import { After, Header, WA } from '../Shell'
import './c.css'

const N = 60
const DIR = '/reboot/frames/r1/c'
const SPLIT = { desk: 0.574, phone: 0.563 } // where the kerf is, across the rendered frame
const TAIL = 0.16 // computers: the last 16% of the scroll saws the page open
const EDGE = 0.07 // once open, each half leaves this much of the screen showing: the grain frames the message

const BEATS = [
  { a: 0.2, b: 0.47, text: 'We buy the log whole.' },
  { a: 0.45, b: 0.72, text: 'And saw it open in our own yard.' },
  { a: 0.7, b: 1.01, text: 'One cut, two halves that mirror each other. Bookmatched.' },
]

const clamp = (x: number) => Math.min(Math.max(x, 0), 1)
const ease = (t: number) => t * t * (3 - 2 * t)

export function Cut() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const left = useRef<HTMLDivElement>(null)
  const right = useRef<HTMLDivElement>(null)
  const cvL = useRef<HTMLCanvasElement>(null)
  const cvR = useRef<HTMLCanvasElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const caps = useRef<(HTMLParagraphElement | null)[]>([])
  const film = useRef<FilmHandle | null>(null)
  const [wide] = useState(isWide)
  const [still] = useState(prefersReduced)
  const [lit, setLit] = useState(-1)
  const [split, setSplit] = useState(false)

  useEffect(() => {
    const r = root.current
    const st = stage.current
    const l = left.current
    const rt = right.current
    const a = cvL.current
    const b = cvR.current
    if (!r || !st || !l || !rt || !a || !b) return
    const ctxR = b.getContext('2d', { alpha: false })
    const seq = createSeq(a, frameUrls(`${DIR}/${wide ? 'desk' : 'phone'}`, N), {
      onDraw: () => {
        if (!ctxR) return
        if (b.width !== a.width || b.height !== a.height) {
          b.width = a.width
          b.height = a.height
        }
        ctxR.drawImage(a, 0, 0) // the right half shows the same frame
        b.classList.add('is-ready')
      },
    })
    let xf = 0.5 // the kerf, as a share of the stage's width
    const clip = () => {
      xf = seq.map(wide ? SPLIT.desk : SPLIT.phone, 0.5).x
      const x = xf * 100
      l.style.clipPath = `inset(0 ${(100 - x).toFixed(3)}% 0 0)`
      rt.style.clipPath = `inset(0 0 0 ${x.toFixed(3)}%)`
      // how far each half travels to leave the same sliver of grain at either edge (phones read these in CSS)
      st.style.setProperty('--open-l', `${(-(xf - EDGE) * 100).toFixed(2)}%`)
      st.style.setProperty('--open-r', `${((1 - xf - EDGE) * 100).toFixed(2)}%`)
    }
    seq.ready.then(clip)
    window.addEventListener('resize', clip)
    if (still) {
      seq.ready.then(() => seq.show(N - 1))
      return () => {
        window.removeEventListener('resize', clip)
        seq.destroy()
      }
    }
    film.current = runFilm({
      root: r,
      watch: st,
      seq,
      tail: wide ? TAIL : 0,
      duration: 6500,
      onProgress: (p, raw) => {
        if (wide) {
          const t = title.current
          if (t) {
            const v = beat(p, 0, 0.2)
            t.style.opacity = v.toFixed(3)
            t.style.transform = `translateY(${((1 - v) * -24).toFixed(1)}px)`
          }
          BEATS.forEach((bt, i) => {
            const el = caps.current[i]
            if (!el) return
            const v = beat(p, bt.a, bt.b) * (1 - clamp((raw - (1 - TAIL)) / 0.05))
            el.style.opacity = v.toFixed(3)
            el.style.transform = `translateY(${((1 - v) * 18).toFixed(1)}px)`
          })
          const s = ease(clamp((raw - (1 - TAIL)) / TAIL))
          l.style.transform = `translateX(${(-s * (xf - EDGE) * 100).toFixed(2)}%)`
          rt.style.transform = `translateX(${(s * (1 - xf - EDGE) * 100).toFixed(2)}%)`
        } else {
          let k = -1
          BEATS.forEach((bt, i) => {
            if (p >= bt.a - 0.02) k = i
          })
          setLit(k)
        }
      },
      onStart: () => setSplit(false),
      onEnd: () => {
        if (!wide) setSplit(true)
      },
    })
    return () => {
      film.current?.destroy()
      window.removeEventListener('resize', clip)
      seq.destroy()
    }
  }, [wide, still])

  const again = () => {
    setSplit(false)
    window.setTimeout(() => film.current?.replay(), 650)
  }

  return (
    <div className={`rb vc${still ? ' is-still' : ''}`} id="top">
      <Header />
      <section className={`vc-film${split ? ' is-split' : ''}`} ref={root} aria-label="The first cut">
        {(!wide || still) && <h1 className="vc-title">Every door starts as a log.</h1>}
        <div className="vc-stage" ref={stage}>
          {wide && !still && (
            <h1 className="vc-title" ref={title}>
              Every door starts as a log.
            </h1>
          )}
          <div className="vc-reveal">
            <h2>No middleman between the log and your door.</h2>
            <p>
              Logs bought whole, sawn in our own yard and seasoned, then made into doors in our own factory, to the
              size of your doorway.
            </p>
            <div className="vc-reveal__ctas">
              <a className="rb-btn" href={config.mapsUrl}>
                Visit the store
              </a>
              <a className="rb-btn rb-btn--quiet" href={WA}>
                WhatsApp us
              </a>
            </div>
          </div>
          <div className="vc-half vc-half--l" ref={left}>
            <img
              className="vc-poster"
              src={`${DIR}/${wide ? 'desk' : 'phone'}/000.webp`}
              alt="The cut end of a teak log: growth rings, a check from the pith, a rim of bark."
            />
            <canvas ref={cvL} aria-hidden="true" />
          </div>
          <div className="vc-half vc-half--r" ref={right} aria-hidden="true">
            <img className="vc-poster" src={`${DIR}/${wide ? 'desk' : 'phone'}/000.webp`} alt="" />
            <canvas ref={cvR} />
          </div>
          {wide && !still && (
            <div className="vc-caps">
              {BEATS.map((bt, i) => (
                <p
                  key={bt.text}
                  ref={(el) => {
                    caps.current[i] = el
                  }}
                >
                  {bt.text}
                </p>
              ))}
            </div>
          )}
        </div>
        {(!wide || still) && (
          <div className="vc-list">
            <ol>
              {BEATS.map((bt, i) => (
                <li key={bt.text} className={still || i === lit ? 'is-on' : ''}>
                  {bt.text}
                </li>
              ))}
            </ol>
            {!still && (
              <button type="button" className={`vc-again${split ? ' is-shown' : ''}`} onClick={again}>
                Play again
              </button>
            )}
          </div>
        )}
      </section>
      <After />
    </div>
  )
}
