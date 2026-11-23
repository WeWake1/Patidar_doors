// PROTOTYPE round 2 · E "Knock" (wild). The screen is a door, close. You knock on it (a tap, a click, Enter): you
// hear it, a ring runs out through the grain from your knuckle, and each knock after the first carries the next
// material in on its ring: door, a teak log end on, a stack of plywood, a WPC door. Four knocks, the four things
// Patidar sells, one confirmed fact each; the fifth brings the door back and says what a website can't do.
// Renders: tools/render/r2/knock.py. Sound: knockAudio.ts (synthesised; off with the button, and silent until
// the first tap, as browsers require). Phones: the same, it is a tap. Reduced motion: no ring, a plain cut.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { config } from '../../../config'
import { isWide, prefersReduced } from '../../lib/film'
import { Foot, Header, LANDMARK, Visit } from '../Shell'
import { knock as playKnock, type Material } from './knockAudio'
import { createRipple, type Ripple, type Surface } from './ripple'
import './e.css'

const DIR = '/reboot/frames/r2/e'
const ORDER: Material[] = ['door', 'timber', 'ply', 'wpc']
const ABOUT: Record<Material, { name: string; line: string; href: string }> = {
  door: { name: 'Doors', line: 'A door leaf we pressed and finished in our own factory.', href: '/doors' },
  timber: {
    name: 'Timber',
    line: 'Teak, end on. We buy the log whole, saw it in our own yard and season it so it doesn’t warp.',
    href: '/timbers',
  },
  ply: { name: 'Ply', line: 'Plywood. Like everything we sell, made to your measurements.', href: '/ply' },
  wpc: { name: 'WPC', line: 'A WPC door. It doesn’t swell.', href: '/wpc' },
}
// which way the ring stretches on each picture: along the stile on the door, round on the log end, along the
// plies on the stack
const GRAIN: Record<Material, Pick<Surface, 'grain' | 'stretch'>> = {
  door: { grain: [0, 1], stretch: 1.3 },
  timber: { grain: [1, 0], stretch: 1 },
  ply: { grain: [1, 0], stretch: 1.7 },
  wpc: { grain: [1, 0], stretch: 1.15 },
}
const LIGHT: Material[] = ['ply', 'wpc'] // pale pictures: the words go dark on them

export function Knock() {
  const stage = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const rip = useRef<Ripple | null>(null)
  const [wide] = useState(isWide)
  const [reduced] = useState(prefersReduced)
  const [cur, setCur] = useState(0)
  const [knocks, setKnocks] = useState(0)
  const [round, setRound] = useState(false) // all four heard
  const [sound, setSound] = useState(true)
  const set = wide ? 'desk' : 'phone'

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const surfaces: Surface[] = ORDER.map((m) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = `${DIR}/${set}/${m}.webp`
      return { img, focus: [0.5, 0.5], ...GRAIN[m] }
    })
    try {
      rip.current = createRipple(cv, surfaces, reduced)
    } catch {
      rip.current = null // no WebGL: the poster stays and the words still change
    }
    return () => {
      rip.current?.destroy()
      rip.current = null
    }
  }, [set, reduced])

  const knockAt = useCallback(
    (x: number, y: number, to?: number) => {
      const st = stage.current
      if (!st) return
      const first = knocks === 0
      const next = to ?? (first ? cur : (cur + 1) % ORDER.length)
      const m = ORDER[next]
      rip.current?.knock(x, y, next === cur ? -1 : next)
      playKnock(m, x / st.clientWidth - 0.5, sound)
      navigator.vibrate?.(12)
      if (!reduced) {
        st.classList.remove('is-thud')
        void st.offsetWidth // restart the shudder
        st.classList.add('is-thud')
      }
      if (!first && next === 0 && cur !== 0) setRound(true)
      setCur(next)
      setKnocks((k) => k + 1)
    },
    [knocks, cur, sound, reduced],
  )

  // a mouse knocks on the press; a finger only on a tap, so starting a scroll on the door never knocks
  const lastPointer = useRef('mouse')
  const at = (e: { clientX: number; clientY: number; currentTarget: HTMLDivElement }) => {
    const r = e.currentTarget.getBoundingClientRect()
    knockAt(e.clientX - r.left, e.clientY - r.top)
  }
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    lastPointer.current = e.pointerType
    if (e.pointerType === 'mouse' && e.button === 0) at(e)
  }
  const onTap = (e: MouseEvent<HTMLDivElement>) => {
    if (lastPointer.current !== 'mouse') at(e)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const st = e.currentTarget
    knockAt(st.clientWidth * 0.5, st.clientHeight * 0.45)
  }
  const jump = (i: number) => {
    const st = stage.current
    if (st) knockAt(st.clientWidth * 0.5, st.clientHeight * 0.45, i)
  }

  const m = ORDER[cur]
  const finale = round && m === 'door'
  return (
    <div className="rb ve" id="top">
      <Header mark={LIGHT.includes(m) ? 'dark' : 'light'} />
      <section className={`ve-hero${LIGHT.includes(m) ? ' is-light' : ''}`} aria-labelledby="ve-h">
        <div
          className="ve-stage"
          ref={stage}
          role="button"
          tabIndex={0}
          aria-label={`Knock on the ${m === 'door' ? 'door' : ABOUT[m].name.toLowerCase()}`}
          onPointerDown={onPointer}
          onClick={onTap}
          onKeyDown={onKey}
          onAnimationEnd={(e) => e.currentTarget.classList.remove('is-thud')}
        >
          <img
            className="ve-poster"
            src={`${DIR}/${set}/door.webp`}
            alt="Close up on a polished teak door: the lock rail, a raised panel and a brass lever handle."
          />
          <canvas ref={canvas} aria-hidden="true" />
          {knocks === 0 && <span className="ve-target" aria-hidden="true" />}
        </div>
        <div className="ve-copy">
          <h1 id="ve-h">Knock.</h1>
          <p className="ve-say" aria-live="polite">
            {knocks === 0
              ? `Go on, ${wide ? 'click' : 'tap'} the door. Sound on, if you can.`
              : finale
                ? 'You can’t knock on a website. Come and knock on the real ones.'
                : ABOUT[m].line}
          </p>
          {knocks > 0 && !finale && (
            <a className="ve-more" href={ABOUT[m].href}>
              {ABOUT[m].name} <span aria-hidden="true">→</span>
            </a>
          )}
          {finale && (
            <div className="ve-finale">
              <a className="rb-btn" href={config.mapsUrl}>
                Directions
              </a>
              <span>{LANDMARK}</span>
            </div>
          )}
          {knocks > 0 && !round && <p className="ve-again">Knock again.</p>}
        </div>
        <div className="ve-foot">
          <ol className="ve-steps" aria-label="What there is to knock on">
            {ORDER.map((k, i) => (
              <li key={k}>
                <button type="button" aria-current={i === cur ? 'true' : undefined} onClick={() => jump(i)}>
                  <span>{String(i + 1).padStart(2, '0')}</span> {ABOUT[k].name}
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="ve-sound" aria-pressed={sound} onClick={() => setSound((s) => !s)}>
            Sound {sound ? 'on' : 'off'}
          </button>
        </div>
      </section>
      <Visit id="ve-visit" title="Come and knock on them." />
      <Foot note="knock sounds are synthesised stand-ins" />
    </div>
  )
}
