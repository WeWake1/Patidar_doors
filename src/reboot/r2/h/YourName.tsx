// PROTOTYPE round 2 · H "Your name here" (premium, personal). A teak main door at eye level with a brass nameplate,
// engraved as you type your family's name; then send the picture to the family. It speaks to homeowners first
// (decisions.md, round 1 Q5) and it travels: the picture carries the store's name and landmark into a family's
// WhatsApp. True thing: everything is made to measure, so each door is made for one doorway. The door is a
// render (tools/render/r2/nameplate.py), not a catalogue design; the name never leaves the device.
// Phones: the picture on top, the field under it. Reduced motion: nothing here moves anyway.
import { useEffect, useRef, useState } from 'react'
import { isWide } from '../../lib/film'
import { Foot, Header, LANDMARK, Visit } from '../Shell'
import { engrave, fontsReady, type PlateData, type Style } from './engrave'
import './h.css'

const DIR = '/reboot/frames/r2/h'
const MAX = 24
const PLACEHOLDER = 'Your name here'

interface Set {
  base: HTMLImageElement
  enamel: HTMLImageElement
  plate: PlateData
}
async function loadSet(name: 'desk' | 'phone'): Promise<Set> {
  const im = (f: string) =>
    new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = no
      i.src = `${DIR}/${name}/${f}`
    })
  const [base, enamel, plate] = await Promise.all([
    im('base.webp'),
    im('enamel.webp'),
    fetch(`${DIR}/${name}/plate.json`).then((r) => r.json() as Promise<PlateData>),
  ])
  return { base, enamel, plate }
}

/** The picture to send: the portrait render, the name, and a strip saying where the door is from. */
function postcard(set: Set, text: string, style: Style): Promise<Blob | null> {
  const [W, H] = set.plate.size
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d')!
  engrave(ctx, set.base, set.enamel, set.plate, text, style)
  const bh = Math.round(H * 0.11)
  ctx.fillStyle = 'rgba(250, 249, 247, 0.96)'
  ctx.fillRect(0, H - bh, W, bh)
  ctx.fillStyle = '#1b1414'
  ctx.font = `400 ${Math.round(bh * 0.34)}px Gloock, Georgia, serif`
  ctx.fillText('Patidar Doors', W * 0.05, H - bh * 0.5)
  ctx.font = `500 ${Math.round(bh * 0.2)}px "Instrument Sans", system-ui, sans-serif`
  ctx.fillStyle = '#5a4f4f'
  ctx.fillText('Doors made to measure', W * 0.05, H - bh * 0.2)
  ctx.textAlign = 'right'
  ctx.fillText('Opposite IKEA, Nagasandra, Bengaluru', W * 0.95, H - bh * 0.2)
  return new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.9))
}

export function YourName() {
  const [wide] = useState(isWide)
  const [name, setName] = useState('')
  const [style, setStyle] = useState<Style>('serif')
  const [view, setView] = useState<Set | null>(null)
  const [card, setCard] = useState<Set | null>(null)
  const [fonts, setFonts] = useState(false)
  const [sent, setSent] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const pic = useRef<HTMLDivElement>(null)
  const blob = useRef<Blob | null>(null)
  const text = name.trim() || PLACEHOLDER

  useEffect(() => {
    let live = true
    void fontsReady().then(() => live && setFonts(true))
    loadSet(wide ? 'desk' : 'phone')
      .then((s) => live && setView(s))
      .catch(() => {})
    ;(wide ? loadSet('phone') : Promise.resolve(null))
      .then((s) => live && s && setCard(s))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [wide])

  // engrave as you type
  useEffect(() => {
    const cv = canvas.current
    if (!cv || !view || !fonts) return
    cv.width = view.plate.size[0]
    cv.height = view.plate.size[1]
    engrave(cv.getContext('2d')!, view.base, view.enamel, view.plate, text, style)
    cv.classList.add('is-ready')
  }, [view, fonts, text, style])

  // the picture to send is made ahead of the tap: iOS spends the tap's permission on any await before share()
  useEffect(() => {
    const set = wide ? card : view
    if (!set || !fonts) return
    blob.current = null
    const id = window.setTimeout(() => {
      void postcard(set, text, style).then((b) => {
        blob.current = b
      })
    }, 300)
    return () => window.clearTimeout(id)
  }, [wide, card, view, fonts, text, style])

  const save = (b: Blob, name: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = name
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
    setSent('Saved to your downloads. Send it on WhatsApp from there.')
  }
  const send = () => {
    const name = 'our-door-patidar.jpg'
    const b = blob.current
    if (!b) {
      // not composed yet (a fast tap after typing): make it now, and save rather than share, since the wait
      // would cost a phone the tap's permission to share
      const set = wide ? card : view
      if (!set) return
      setSent('One moment…')
      void postcard(set, text, style).then((x) => x && save(x, name))
      return
    }
    const file = new File([b], name, { type: 'image/jpeg' })
    const words = `Our name on a door from Patidar Doors. ${LANDMARK}, Bengaluru.`
    // phones share (WhatsApp is one tap away); computers save, as the button says
    if (!wide && navigator.canShare?.({ files: [file] })) {
      navigator
        .share({ files: [file], text: words })
        .then(() => setSent('Sent.'))
        .catch((e: unknown) => {
          if ((e as { name?: string })?.name !== 'AbortError') save(b, name)
        })
      return
    }
    save(b, name)
  }

  const plate = view?.plate
  const fx = plate ? ((plate.quad[0][0] + plate.quad[1][0]) / 2 / plate.size[0]) * 100 : 60
  const fy = plate ? ((plate.quad[0][1] + plate.quad[3][1]) / 2 / plate.size[1]) * 100 : 40
  return (
    <div className="rb vh" id="top">
      <Header />
      <section className="vh-hero" aria-labelledby="vh-h">
        <div className="vh-intro">
          <h1 id="vh-h">Your name here.</h1>
          <p className="vh-lead">
            Type your family’s name and watch it go on the door. Everything we make is made to measure, so a door
            from us is made for one doorway: yours.
          </p>
        </div>
        <div className="vh-pic" ref={pic}>
          <img
            className="vh-poster"
            src={`${DIR}/${wide ? 'desk' : 'phone'}/base.webp`}
            alt="A polished teak main door at eye level with a brushed brass nameplate on it."
            style={{ objectPosition: `${fx}% ${fy}%` }}
          />
          <canvas
            ref={canvas}
            role="img"
            aria-label={`The nameplate reads: ${text}`}
            style={{ objectPosition: `${fx}% ${fy}%` }}
          />
        </div>
        <div className="vh-form">
          <label className="vh-field">
            <span>Family name</span>
            <input
              type="text"
              value={name}
              maxLength={MAX}
              autoComplete="family-name"
              autoCapitalize="words"
              spellCheck={false}
              placeholder="The Raos"
              onFocus={() => {
                // phones: the keyboard takes half the screen; keep the plate in sight above the field
                if (!wide) window.setTimeout(() => pic.current?.scrollIntoView({ block: 'start' }), 350)
              }}
              onChange={(e) => {
                setName(e.target.value)
                setSent('')
              }}
            />
          </label>
          <div className="vh-styles" role="radiogroup" aria-label="Lettering">
            {(['serif', 'caps'] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)}>
                {s === 'serif' ? 'Serif' : 'Capitals'}
              </button>
            ))}
          </div>
          <div className="vh-send">
            <button type="button" className="rb-btn" onClick={send}>
              {wide ? 'Save the picture' : 'Send it to the family'}
            </button>
            <p>{sent || `The name stays on your ${wide ? 'computer' : 'phone'}.`}</p>
          </div>
        </div>
      </section>
      <Visit
        id="vh-visit"
        title="Then come and choose the door."
        lead="We measure your doorway for free in Bengaluru, and make the door to fit it."
      />
      <Foot note="the door is a render; the nameplate is only a way to picture it" />
    </div>
  )
}
