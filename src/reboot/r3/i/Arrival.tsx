// PROTOTYPE round 3 · I "Arrival" (Blender film). A bright morning: a white entrance court under a pergola of white
// fins, the sun laid across the walls and the pale marble in stripes, plants in low planters, and at the back a main
// door in a teak-lined portal. The camera glides from the drive, through the opening, up to the door. Computers:
// the scroll drives the film (pinned, eased); phones: it plays once by itself when in view, then "Play again"
// (decisions.md round 1 Q11); reduced motion: the last frame. Renders: tools/render/r3/arrival.py (the door's face
// is a catalogue photograph). The frame player is round 1's (lib/seq.ts, lib/film.ts).
import { useEffect, useRef, useState } from 'react'
import { beat, isWide, prefersReduced, runFilm } from '../../lib/film'
import { createSeq, frameUrls } from '../../lib/seq'
import { Foot, Header, LANDMARK, Visit, WA } from '../Shell'
import '../r3.css'
import './i.css'

const DIR = '/reboot/frames/r3/i'

export function Arrival() {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const title = useRef<HTMLDivElement>(null)
  const caps = useRef<(HTMLElement | null)[]>([])
  const replay = useRef(() => {})
  const [wide] = useState(isWide)
  const [ended, setEnded] = useState(prefersReduced)

  useEffect(() => {
    const r = root.current
    const s = stage.current
    const cv = canvas.current
    if (!r || !s || !cv) return
    const n = wide ? 96 : 60
    const seq = createSeq(cv, frameUrls(`${DIR}/${wide ? 'desk' : 'phone'}`, n), { focus: { x: 0.5, y: 0.5 } })
    const film = runFilm({
      root: r,
      watch: s,
      seq,
      tail: 0.12,
      duration: 8000,
      onProgress(p) {
        if (title.current && wide) title.current.style.opacity = String(Math.max(0, 1 - p / 0.12))
        const o = [beat(p, 0.22, 0.48), beat(p, 0.55, 0.8), p > 0.9 ? Math.min((p - 0.9) / 0.06, 1) : 0]
        caps.current.forEach((el, i) => {
          if (!el) return
          el.style.opacity = String(o[i])
          el.style.visibility = o[i] > 0.01 ? 'visible' : 'hidden'
        })
      },
      onStart: () => setEnded(false),
      onEnd: () => setEnded(true),
    })
    replay.current = film.replay
    return () => {
      film.destroy()
      seq.destroy()
    }
  }, [wide])

  return (
    <div className="rb r3 vi" id="top">
      <Header />
      <section className="vi-film" ref={root} aria-labelledby="vi-h">
        {!wide && (
          <div className="vi-title vi-title--flow">
            <h1 id="vi-h" className="r3-title">
              The first thing they see.
            </h1>
            <p className="r3-sub">Main doors, made to measure for your doorway.</p>
          </div>
        )}
        <div className="vi-stage" ref={stage}>
          <img
            className="vi-poster"
            src={`${DIR}/${wide ? 'desk' : 'phone'}/000.webp`}
            alt="A white entrance court in morning sun, stripes of light from a pergola across the walls, a teak main door at the back."
          />
          <canvas ref={canvas} aria-hidden="true" />
          {wide && (
            <div className="vi-title" ref={title}>
              <h1 id="vi-h" className="r3-title">
                The first thing they see.
              </h1>
              <p className="r3-sub">Main doors, made to measure for your doorway.</p>
            </div>
          )}
          <p className="vi-cap r3-cap" ref={(el) => void (caps.current[0] = el)}>
            Made to measure for your doorway.
          </p>
          <p className="vi-cap vi-cap--right r3-cap" ref={(el) => void (caps.current[1] = el)}>
            Pressed and finished in our own factory.
          </p>
          <div className="vi-cap vi-cap--end" ref={(el) => void (caps.current[2] = el)}>
            <p className="r3-cap">Come and see it in daylight.</p>
            <div className="r3-ctas">
              <a className="rb-btn" href="/doors">
                See the doors
              </a>
              <a className="rb-btn rb-btn--quiet" href={WA}>
                WhatsApp
              </a>
            </div>
          </div>
          {!wide && ended && (
            <button type="button" className="r3-again vi-again" onClick={() => replay.current()}>
              Play again
            </button>
          )}
        </div>
      </section>
      <Visit title="Then come and see it." lead={`${LANDMARK}.`} />
      <Foot />
    </div>
  )
}
