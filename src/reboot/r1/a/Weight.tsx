// PROTOTYPE round 1 · A "The weight" (premium). One tall solid-teak door in a quiet white room. You push it: it
// lags your hand the way a heavy thing does, keeps its momentum when you let go and slows on its hinges; as it
// opens, the sunlit courtyard behind throws a slab of light across the floor. 37 frames = 0..108 degrees,
// rendered by tools/render/r1/weight.py (desktop 1600x900, phone 800x1000 portrait).
// True thing: the door is solid teak from logs bought whole and sawn in Patidar's own yard (round 1 Q9).
import { useEffect, useRef, useState } from 'react'
import { config } from '../../../config'
import { isWide, prefersReduced } from '../../lib/film'
import { createSeq, frameUrls } from '../../lib/seq'
import { After, Header, WA } from '../Shell'
import './a.css'

const N = 37
const DIR = '/reboot/frames/r1/a'

export function Weight() {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const hint = useRef<HTMLParagraphElement>(null)
  const [touched, setTouched] = useState(false)
  const [wide] = useState(isWide)

  useEffect(() => {
    const st = stage.current
    const cv = canvas.current
    if (!st || !cv) return
    const seq = createSeq(cv, frameUrls(`${DIR}/${wide ? 'desk' : 'phone'}`, N), {
      focus: wide ? { x: 0.66, y: 0.5 } : { x: 0.5, y: 0.5 },
    })
    // the hint sits beside the handle: placed through the crop, so it stays on the door at any screen shape
    const placeHint = () => {
      const h = hint.current
      if (!h) return
      const p = wide ? seq.map(0.548, 0.6) : seq.map(0.5, 0.9) // phones: on the floor, under the door
      h.style.left = `${(p.x * 100).toFixed(2)}%`
      h.style.top = `${(p.y * 100).toFixed(2)}%`
    }
    seq.ready.then(placeHint)
    window.addEventListener('resize', placeHint)

    const maxF = N - 1
    let f = 0
    let v = 0
    let raf = 0
    let last = performance.now()
    let dragging = false
    let x0 = 0
    let f0 = 0
    let target = 0
    const pxPerFrame = () => st.clientWidth / (wide ? 30 : 16)
    const tick = (now: number) => {
      const dt = Math.min(now - last, 48)
      last = now
      if (dragging) {
        const nf = f + (target - f) * (1 - Math.exp(-dt / 170)) // heavy: it lags the hand
        v = (nf - f) / Math.max(dt, 1)
        f = nf
      } else {
        f += v * dt
        v *= Math.exp(-dt / 540) // the hinges' friction
        if (f < 0) {
          f = 0
          v = -v * 0.12 // shut against the stop: a small rebound, no more
        }
        if (f > maxF) {
          f = maxF
          v = -v * 0.12
        }
      }
      seq.show(f)
      raf = dragging || Math.abs(v) > 0.00004 ? requestAnimationFrame(tick) : 0
    }
    const kick = () => {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    const reduce = prefersReduced()
    const down = (e: PointerEvent) => {
      dragging = true
      x0 = e.clientX
      f0 = f
      target = f
      st.setPointerCapture(e.pointerId)
      setTouched(true)
      kick()
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const t = f0 + (e.clientX - x0) / pxPerFrame()
      target = Math.min(Math.max(t, -0.4), maxF + 0.4)
      if (reduce) f = Math.min(Math.max(target, 0), maxF) // no inertia: the door goes where the hand is
    }
    const up = () => {
      dragging = false
      if (reduce) v = 0
      kick()
    }
    st.addEventListener('pointerdown', down)
    st.addEventListener('pointermove', move)
    st.addEventListener('pointerup', up)
    st.addEventListener('pointercancel', up)
    // once the first frames are in, the door gives a little by itself: it says "this moves"
    let nudge = 0
    if (!reduce) {
      seq.done.then(() => {
        nudge = window.setTimeout(() => {
          if (!dragging && f === 0) {
            v = 0.0055 // a crack: a few degrees and a sliver of light, enough to say it moves
            kick()
          }
        }, 700)
      })
    }
    return () => {
      st.removeEventListener('pointerdown', down)
      st.removeEventListener('pointermove', move)
      st.removeEventListener('pointerup', up)
      st.removeEventListener('pointercancel', up)
      window.removeEventListener('resize', placeHint)
      window.clearTimeout(nudge)
      cancelAnimationFrame(raf)
      seq.destroy()
    }
  }, [wide])

  return (
    <div className="rb va" id="top">
      <Header />
      <section className="va-hero">
        <div className="va-stage" ref={stage}>
          <img
            className="va-poster"
            src={`${DIR}/${wide ? 'desk' : 'phone'}/000.webp`}
            alt="A tall solid teak door with a long brass pull, closed, in a quiet white room."
          />
          <canvas ref={canvas} aria-hidden="true" />
          <p className={`va-hint${touched ? ' is-gone' : ''}`} ref={hint} aria-hidden="true">
            {wide ? 'Push it' : 'Swipe right to push it'} <span>→</span>
          </p>
        </div>
        <div className="va-copy">
          <h1>
            Heavy,
            <br />
            because it is solid.
          </h1>
          <p>
            Teak doors from logs we buy whole and saw in our own yard, seasoned so they stay straight, then
            pressed and finished in our own factory. Three generations in timber.
          </p>
          <div className="va-ctas">
            <a className="rb-btn" href={config.mapsUrl}>
              Visit the store
            </a>
            <a className="va-link" href={WA}>
              WhatsApp us
            </a>
          </div>
        </div>
      </section>
      <After />
    </div>
  )
}
