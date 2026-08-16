/**
 * "See it in your doorway" — /try/:id
 *
 * The customer photographs the door they already have, drags four corners onto
 * it, and the chosen leaf is warped into that exact rectangle.
 *
 * ⚠️ The instruction is **outline your existing door**, never "outline the
 * doorway", and that is a design decision rather than a wording one. Outlining
 * the real leaf means the replacement provably covers it (no halo of the old
 * door around the new one), leaves the architrave, reveal shadow, skirting and
 * floor line in the photograph *in front of* the new leaf — which is what makes
 * a composite read as real — and hands us the door's true proportions, which
 * Phase 1b turns into a size and a price. Ask for the doorway instead and all
 * three quietly stop working.
 *
 * A route rather than an overlay, for reasons that are specific to this app:
 * Back is the gesture people use to leave a full-screen camera view, and this
 * codebase deliberately has no `popstate` handling anywhere — as an overlay,
 * Back would throw the visitor off the PDP and bin their work. A route also
 * makes `/try/kyoto?h=84&w=33` a link the store can paste into WhatsApp, and
 * inherits the pathname-keyed ErrorBoundary and the lazy split for free.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DoorLayer } from '../components/tryathome/DoorLayer'
import { QuadEditor } from '../components/tryathome/QuadEditor'
import { config, whatsappLink } from '../config'
import { getProduct, tonesFor, type Product, type Tone } from '../data/products'
import { configFromLine, formatSizeLabel, toSizeId } from '../data/pricing'
import type { Quad } from '../lib/homography'
import { t } from '../lib/i18n'
import { loadPhoto, sampleAmbient, PhotoError, type Ambient, type LoadedPhoto, type PhotoErrorCode } from '../lib/photoLoad'
import { guessDoorQuad } from '../lib/quadGuess'
/* Statically imported, and it has to be: a dynamic import() inside the tap
   handler is an await, and iOS treats that as having spent the user
   activation, so navigator.share() then rejects with NotAllowedError. The
   module is ~1 kB. The heavy compositor stays lazy — that one runs on a
   different tap. */
import { canShareFiles, shareImage, type ShareOutcome } from '../lib/shareImage'
import { usePageMeta } from '../lib/usePageMeta'
import { NotFound } from './NotFound'
// Route-scoped on purpose — see the file header. Importing it here is what
// keeps it out of the entry bundle's stylesheet.
import '../styles/tryathome.css'

/** How much of the photo's height a default (unguessed) leaf takes up. */
const DEFAULT_FILL = 0.55

/** Re-reading the surround on every pointermove would be a getImageData a frame. */
const AMBIENT_SETTLE_MS = 150

export function TryAtHome() {
  const { id } = useParams()
  const product = id ? getProduct(id) : undefined
  if (!product) return <NotFound />
  return <TryInner key={product.id} product={product} />
}

function TryInner({ product }: { product: Product }) {
  const [params] = useSearchParams()
  const visual = product.visual

  /* A hand-edited URL gets the same field-by-field validation a hand-edited
     localStorage cart gets — same function, deliberately. An unvalidated
     option here would reach the pricing table as `undefined` exactly the way
     the stored-cart bug did. */
  const cfg = useMemo(() => {
    const h = Number(params.get('h'))
    const w = Number(params.get('w'))
    return configFromLine(Number.isFinite(h) && Number.isFinite(w) ? toSizeId(h, w) : '')
  }, [params])

  const tones = useMemo(() => tonesFor(product), [product])
  const [tone, setTone] = useState<Tone>(() => {
    const want = params.get('t') ?? (visual.kind === 'art' ? visual.defaultTone : '')
    return tones.find((x) => x.id === want) ?? tones[0]
  })

  const [photo, setPhoto] = useState<LoadedPhoto | null>(null)
  const [err, setErr] = useState<PhotoErrorCode | null>(null)
  const [busy, setBusy] = useState(false)
  const [quadN, setQuadN] = useState<Quad | null>(null)
  const [ambient, setAmbient] = useState<Ambient | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [stage, setStage] = useState({ w: 0, h: 0 })
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [composing, setComposing] = useState(false)
  const [composeErr, setComposeErr] = useState(false)
  const [shared, setShared] = useState<ShareOutcome | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<LoadedPhoto | null>(null)
  const resultRef = useRef<{ blob: Blob; url: string } | null>(null)

  usePageMeta(t('try.title', { name: product.name }))

  /* The nav, footer and floating WhatsApp button all step aside while a photo
     is on screen — the same `body`-class lever useScrollLock already pulls for
     overlays, rather than branching Storefront. */
  useEffect(() => {
    if (!photo) return
    document.body.classList.add('has-fullscreen')
    return () => document.body.classList.remove('has-fullscreen')
  }, [photo])

  // One capped surface at a time. Leaving the route with a 1600px canvas and
  // an object URL still live is how this feature would leak a tab's memory.
  useEffect(() => {
    photoRef.current = photo
  }, [photo])
  useEffect(() => {
    resultRef.current = result
  }, [result])
  useEffect(
    () => () => {
      photoRef.current?.release()
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    },
    [],
  )

  /* Fit the photo inside whatever space the stage has, both axes. */
  useEffect(() => {
    const el = stageRef.current
    if (!el || !photo) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const s = Math.min(r.width / photo.w, r.height / photo.h)
      setStage({ w: Math.round(photo.w * s), h: Math.round(photo.h * s) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [photo])

  /* Ambient is sampled from the wall *around* the quad, so it moves with the
     handles — but only once they settle. */
  useEffect(() => {
    if (!photo || !quadN) return
    const timer = setTimeout(() => {
      setAmbient(sampleAmbient(photo.canvas, scaleQuad(quadN, photo.canvas.width, photo.canvas.height)))
    }, AMBIENT_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [photo, quadN])

  const onPick = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setBusy(true)
      setErr(null)
      try {
        const next = await loadPhoto(file)
        photoRef.current?.release()
        /* The guess runs before the place step's first paint, so the handles
           are simply already there — there is no "detecting" state to show and
           nothing to wait for. When it declines, a centred default lands
           instead and the customer cannot tell which happened. */
        const guess = guessDoorQuad(next.canvas)
        const q = guess
          ? scaleQuad(guess, 1 / next.canvas.width, 1 / next.canvas.height)
          : defaultQuad(next.w, next.h, cfg.widthIn, cfg.heightIn)
        setPhoto(next)
        setQuadN(q)
        setAmbient(sampleAmbient(next.canvas, scaleQuad(q, next.canvas.width, next.canvas.height)))
        setFlipped(false)
      } catch (e) {
        setErr(e instanceof PhotoError ? e.code : 'decode')
      } finally {
        setBusy(false)
      }
    },
    [cfg.widthIn, cfg.heightIn],
  )

  const reset = useCallback(() => {
    if (!photo) return
    setQuadN(defaultQuad(photo.w, photo.h, cfg.widthIn, cfg.heightIn))
    setFlipped(false)
  }, [photo, cfg.widthIn, cfg.heightIn])

  const sizeLabel = formatSizeLabel(cfg.heightIn, cfg.widthIn)
  const shareText = t('try.share.text', { brand: config.brand, name: product.name, size: sizeLabel })

  /* Compose on "Looks right", not on the share tap — see the shareImage import.
     Everything heavy is behind this one await chain, and both modules stay out
     of the route chunk until someone actually finishes a placement. */
  const compose = useCallback(async () => {
    if (!photo || !quadN) return
    const live = document.querySelector<SVGSVGElement>('.tryd__art')
    if (!live) return
    setComposing(true)
    setComposeErr(false)
    try {
      const [{ rasterizeDoor }, { composeTryOn }] = await Promise.all([
        import('../lib/doorRaster'),
        import('../lib/compose'),
      ])
      // Rasterise at roughly the size the leaf lands at, so the grain is drawn
      // once at the resolution it will be seen at and no finer.
      const cq = scaleQuad(quadN, photo.canvas.width, photo.canvas.height)
      const side = (a: number, b: number) => Math.hypot(cq[b].x - cq[a].x, cq[b].y - cq[a].y)
      const rh = Math.round(Math.min(2048, Math.max(700, (side(0, 3) + side(1, 2)) / 2)))
      const door = await rasterizeDoor(live, Math.round(rh * (cfg.widthIn / cfg.heightIn)), rh)
      const blob = await composeTryOn({
        photo: photo.canvas,
        quadN,
        door,
        flipped,
        ambient,
        footer: { name: product.name, size: sizeLabel, site: 'patidartimbers.com' },
      })
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
      setResult({ blob, url: URL.createObjectURL(blob) })
      setShared(null)
    } catch {
      setComposeErr(true)
    } finally {
      setComposing(false)
    }
  }, [photo, quadN, flipped, ambient, cfg.widthIn, cfg.heightIn, product.name, sizeLabel])

  /* Back to the handles. The composed blob is thrown away rather than kept
     warm — the next placement will differ, and an object URL left behind is a
     copy of the customer's home held in memory for no reason. */
  const adjust = useCallback(() => {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
    setResult(null)
    setShared(null)
  }, [])

  const send = useCallback(async () => {
    if (!result) return
    setShared(await shareImage(result.blob, `${product.id}-in-my-doorway.jpg`, shareText))
  }, [result, product.id, shareText])

  const back = `/product/${product.id}`

  // Phase 1 renders the 12 vector doors. The photographed doors need their
  // leaf corners marked in /admin before they can be cut out, and the timber,
  // ply and WPC products want the surface and volume modes instead — so say so
  // plainly rather than showing a broken stage.
  if (visual.kind !== 'art') {
    return (
      <div className="try try--plain page-pad">
        <h1 className="try__oops">{t('try.title', { name: product.name })}</h1>
        <p className="try__note">{t('try.unsupported')}</p>
        <Link className="btn btn--dark btn--big" to={back}>
          {t('try.backToDoor')}
        </Link>
      </div>
    )
  }

  return (
    <div className={`try${photo ? ' try--live' : ''}`}>
      <header className="try__bar">
        <Link className="try__back" to={back}>
          {t('try.backToDoor')}
        </Link>
        <span className="try__name">
          {product.name} · {sizeLabel}
        </span>
      </header>

      {!photo ? (
        <div className="try__pick">
          <p className="try__lede">{t('try.pick.hint')}</p>
          <div className="try__pickrow">
            <FileButton className="btn btn--dark btn--big" capture onPick={onPick} busy={busy}>
              {t('try.pick.take')}
            </FileButton>
            <FileButton className="btn btn--ghost btn--big" onPick={onPick} busy={busy}>
              {t('try.pick.choose')}
            </FileButton>
          </div>
          <p className="try__privacy">{t('try.pick.privacy')}</p>
          {err && (
            <p className="try__err" role="alert">
              {t(`try.err.${err}`)}
            </p>
          )}
        </div>
      ) : result ? (
        <>
          <div className="try__stage">
            <img className="try__out" src={result.url} alt="" />
          </div>
          <div className="try__controls">
            {shared === 'downloaded' && <p className="try__hint">{t('try.result.saved')}</p>}
            <button type="button" className="btn btn--dark btn--big try__done" onClick={send}>
              {canShareFiles() ? t('try.result.share') : t('try.result.save')}
            </button>
            <div className="try__actions">
              <button type="button" className="btn btn--ghost" onClick={adjust}>
                {t('try.result.adjust')}
              </button>
              <a className="btn btn--ghost" href={whatsappLink(shareText)} target="_blank" rel="noreferrer">
                {t('try.result.share')}
              </a>
            </div>
            <p className="try__hint">{t('try.result.note')}</p>
          </div>
        </>
      ) : (
        <>
          <div className="try__stage" ref={stageRef}>
            {stage.w > 0 && quadN && (
              <div className="try__frame" style={{ width: stage.w, height: stage.h }}>
                <img className="try__photo" src={photo.url} alt="" width={stage.w} height={stage.h} />
                <DoorLayer
                  art={visual.art}
                  tone={tone}
                  quad={scaleQuad(quadN, stage.w, stage.h)}
                  heightIn={cfg.heightIn}
                  widthIn={cfg.widthIn}
                  flipped={flipped}
                  ambient={ambient}
                />
                <QuadEditor
                  quad={scaleQuad(quadN, stage.w, stage.h)}
                  onChange={(q) => setQuadN(scaleQuad(q, 1 / stage.w, 1 / stage.h))}
                  width={stage.w}
                  height={stage.h}
                  photoUrl={photo.url}
                />
              </div>
            )}
          </div>

          <div className="try__controls">
            <p className="try__hint">{t('try.place.hint')}</p>
            <div className="try__tones">
              {tones.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={`try__tone${x.id === tone.id ? ' is-on' : ''}`}
                  style={{ background: x.base }}
                  aria-label={x.name}
                  aria-pressed={x.id === tone.id}
                  onClick={() => setTone(x)}
                />
              ))}
            </div>
            <div className="try__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setFlipped((f) => !f)}>
                {t('try.place.flip')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={reset}>
                {t('try.place.reset')}
              </button>
              <FileButton className="btn btn--ghost" onPick={onPick} busy={busy}>
                {t('try.retake')}
              </FileButton>
            </div>
            <button
              type="button"
              className="btn btn--dark btn--big try__done"
              onClick={compose}
              disabled={composing}
            >
              {composing ? t('try.working') : t('try.place.done')}
            </button>
            {composeErr && (
              <p className="try__err" role="alert">
                {t('try.err.compose')}{' '}
                <a href={whatsappLink(shareText)} target="_blank" rel="noreferrer">
                  {config.phoneDisplay}
                </a>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * A styled file picker.
 *
 * ⚠️ `capture` is a *forcing* attribute, not a hint: where it is honoured it
 * removes the photo-library option outright. So it goes on the "Take a photo"
 * control only — half of all visitors are trying a door they photographed
 * yesterday, and the counter staff work from photos customers sent them on
 * WhatsApp. One input carrying both jobs would lock all of them out.
 */
function FileButton({
  children,
  className,
  capture,
  busy,
  onPick,
}: {
  children: React.ReactNode
  className: string
  capture?: boolean
  busy: boolean
  onPick: (f: File | undefined) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className={className} disabled={busy} onClick={() => ref.current?.click()}>
        {children}
      </button>
      <input
        ref={ref}
        className="try__file"
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' as const } : {})}
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = '' // so picking the same file twice still fires
        }}
      />
    </>
  )
}

/** Multiply a quad's coordinates — normalised ⇄ pixels, both directions. */
function scaleQuad(q: Quad, sx: number, sy: number): Quad {
  return [
    { x: q[0].x * sx, y: q[0].y * sy },
    { x: q[1].x * sx, y: q[1].y * sy },
    { x: q[2].x * sx, y: q[2].y * sy },
    { x: q[3].x * sx, y: q[3].y * sy },
  ]
}

/** A centred leaf at the configured proportions, in normalised coordinates. */
function defaultQuad(pw: number, ph: number, widthIn: number, heightIn: number): Quad {
  const hN = DEFAULT_FILL
  const wN = Math.min(0.8, (hN * ph * (widthIn / heightIn)) / pw)
  const x0 = (1 - wN) / 2
  const y0 = (1 - hN) / 2
  return [
    { x: x0, y: y0 },
    { x: x0 + wN, y: y0 },
    { x: x0 + wN, y: y0 + hN },
    { x: x0, y: y0 + hN },
  ]
}
