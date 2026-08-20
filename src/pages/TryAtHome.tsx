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

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DoorArt } from '../components/DoorArt'
import { DoorLayer } from '../components/tryathome/DoorLayer'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { CameraShot } from '../components/tryathome/CameraShot'
import { QuadEditor } from '../components/tryathome/QuadEditor'
import { useArSupport } from '../lib/arSupport'
import { cameraAvailable, type CameraErrorCode } from '../lib/cameraCapture'
import { config, whatsappLink } from '../config'
import {
  defaultToneId,
  getProduct,
  leafOf,
  quoteFor,
  tonesFor,
  tryState,
  type Product,
  type Tone,
} from '../data/products'
import type { LeafSource } from '../components/tryathome/DoorLayer'
import { SIZE_LIMITS, configFromLine, formatFtIn, formatSizeLabel, toSizeId } from '../data/pricing'
import { fmtINR } from '../lib/format'
import { rectQuad, type Quad } from '../lib/homography'
import { t } from '../lib/i18n'
import { rectifyAspect, sizeFromHeight } from '../lib/rectify'
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

/**
 * Handheld AR, on the devices that have it.
 *
 * Lazy because it carries a WebGL renderer and the XR plumbing, and it is only
 * ever reachable on ARCore-backed Android — every other visitor should not pay
 * a byte for it. It is mounted as soon as support is known rather than on the
 * tap, because `requestSession` needs the tap's activation and a download would
 * spend it; see the header of ArPlacement.tsx.
 */
const ArPlacement = lazy(() =>
  import('../components/tryathome/ArPlacement').then((m) => ({ default: m.ArPlacement })),
)

/** How much of the photo's height a default (unguessed) leaf takes up. */
const DEFAULT_FILL = 0.55

/** Re-reading the surround on every pointermove would be a getImageData a frame. */
const AMBIENT_SETTLE_MS = 150

/**
 * The one thing the photograph can't tell us: absolute scale. Proportions come
 * out of the outline; a tap on one of these turns them into inches. These are
 * the four heights nearly every Indian home door is built to, so the answer is
 * usually a single tap rather than a trip for a tape measure.
 */
const HEIGHT_CHIPS = [78, 81, 84, 96]

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
    /* ⚠️ `Number(null)` is 0, and `Number.isFinite(0)` is true — so reading the
       params straight through turned a bare /try/:id (no query at all, which is
       exactly what a pasted or shared link looks like) into a 0×0 door, which
       `configFromLine` then clamped to the *smallest* size we sell. The picture
       went out stamped "5′ × 1′8″" instead of the standard 8′ × 3′. Absent and
       zero are different answers; say so explicitly. */
    const num = (key: string): number | null => {
      const raw = params.get(key)
      if (raw === null || raw.trim() === '') return null
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : null
    }
    const h = num('h')
    const w = num('w')
    return configFromLine(h !== null && w !== null ? toSizeId(h, w) : '')
  }, [params])

  const tones = useMemo(() => tonesFor(product), [product])
  /* ⚠️ `Tone | undefined`, and the type is the point. `tonesFor` returns [] for
     anything that is not a drawn door, so `tones[0]` is undefined — which is
     now *every* product in the catalogue, since the drawn doors were removed
     and every sellable door is a photograph of one real leaf in one real
     finish. Typing this as `Tone` was a lie the compiler could not catch, and
     `tone.id` two hundred lines below crashed the whole route. Same scar as
     `pickTone`'s dependency array; see the ⚠️ on it. */
  const [tone, setTone] = useState<Tone | undefined>(() => {
    const want = params.get('t') ?? (visual.kind === 'art' ? visual.defaultTone : '')
    return tones.find((x) => x.id === want) ?? tones[0]
  })
  /* What to price with. `getTone` already falls back to a neutral wood tone
     with a zero delta when a product has no finishes, so this is the honest
     answer for a photographed door rather than a placeholder. */
  const toneId = tone?.id ?? defaultToneId(product)

  /* What gets stood in the doorway: a drawn leaf tinted by the chosen finish,
     or a photographed one cut out of its catalogue shot — either by the
     admin's corner cropper or by `npm run leaves:build` from the corners
     marked in photoMap.ts. `leafOf` owns that choice so this route and the PDP
     button can never disagree; null means there is no leaf to place, and
     `tryState` says why.
     ⚠️ Memoised because it is DoorLayer's memo key. Rebuilt every render it
     would invalidate the homography and re-reconcile the ~180-node SVG subtree
     on every frame of a drag — the exact cost DoorInner exists to avoid. */
  const source = useMemo<LeafSource | null>(
    () => {
      if (visual.kind === 'art' && tone) return { kind: 'art', art: visual.art, tone }
      const leaf = leafOf(product)
      return leaf ? { kind: 'photo', photo: leaf } : null
    },
    [product, visual, tone],
  )

  const [photo, setPhoto] = useState<LoadedPhoto | null>(null)
  const [err, setErr] = useState<PhotoErrorCode | null>(null)
  const [busy, setBusy] = useState(false)
  const [quadN, setQuadN] = useState<Quad | null>(null)
  const [ambient, setAmbient] = useState<Ambient | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [stage, setStage] = useState({ w: 0, h: 0 })
  const [result, setResult] = useState<{ blob: Blob; url: string; ratio: number | null } | null>(null)
  const [estHeight, setEstHeight] = useState<number | null>(null)
  const [composing, setComposing] = useState(false)
  const [composeErr, setComposeErr] = useState(false)
  const [shared, setShared] = useState<ShareOutcome | null>(null)

  /* False on every iPhone and on any Android without ARCore, which is most of
     the reason this is a hook and not a render-time check — the answer is an
     async round trip to the platform. */
  const arOk = useArSupport()

  /* The viewfinder, which — unlike AR — works anywhere getUserMedia does,
     iPhones included. Synchronous: this is a capability check, not a permission
     one. Permission is what the shutter tap asks for. */
  const [cam, setCam] = useState(false)
  const [camErr, setCamErr] = useState<CameraErrorCode | null>(null)

  /* Set when a finish is picked on the *result* screen, which has to redraw the
     saved picture rather than just re-render a preview. Holding the tone here
     is what makes the hidden raster stage mount for exactly one pass. */
  const [reTone, setReTone] = useState<Tone | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<LoadedPhoto | null>(null)
  const resultRef = useRef<{ blob: Blob; url: string; ratio: number | null } | null>(null)

  usePageMeta(t('try.title', { name: product.name }))

  /* The nav, footer and floating WhatsApp button all step aside while a photo
     is on screen — the same `body`-class lever useScrollLock already pulls for
     overlays, rather than branching Storefront. */
  useEffect(() => {
    if (!photo && !cam) return
    document.body.classList.add('has-fullscreen')
    return () => document.body.classList.remove('has-fullscreen')
  }, [photo, cam])

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

  /**
   * Everything that happens once we hold pixels, whichever door they came in
   * through — an uploaded file or a frame off the live camera. Both produce the
   * same `LoadedPhoto`, so past this point there is one path, not two.
   */
  const acceptPhoto = useCallback(
    (next: LoadedPhoto) => {
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
    },
    [cfg.widthIn, cfg.heightIn],
  )

  const onPick = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setBusy(true)
      setErr(null)
      try {
        acceptPhoto(await loadPhoto(file))
      } catch (e) {
        setErr(e instanceof PhotoError ? e.code : 'decode')
      } finally {
        setBusy(false)
      }
    },
    [acceptPhoto],
  )

  /* The viewfinder closes on the shot, so the place step is what the customer
     sees next — the camera never lingers over a photo already taken. */
  const onShot = useCallback(
    (next: LoadedPhoto) => {
      setCam(false)
      setCamErr(null)
      setErr(null)
      acceptPhoto(next)
    },
    [acceptPhoto],
  )

  const onCamFail = useCallback((code: CameraErrorCode) => {
    setCam(false)
    setCamErr(code)
  }, [])

  const reset = useCallback(() => {
    if (!photo) return
    setQuadN(defaultQuad(photo.w, photo.h, cfg.widthIn, cfg.heightIn))
    setFlipped(false)
  }, [photo, cfg.widthIn, cfg.heightIn])

  const sizeLabel = formatSizeLabel(cfg.heightIn, cfg.widthIn)

  /* What the customer's *own* door measures, once they've told us its height.
     The outline gives the proportions; the chip gives the one scalar that
     turns proportions into inches. */
  const estimate =
    result?.ratio != null && estHeight != null
      ? sizeFromHeight(result.ratio, estHeight, SIZE_LIMITS)
      : null
  const estLabel = estimate ? formatSizeLabel(estimate.heightIn, estimate.widthIn) : null
  const estQuote = estimate ? quoteFor(product, { ...cfg, ...estimate }, toneId) : null

  /* ⚠️ The estimate reaches WhatsApp only with its caveat welded on. This
     number is good to about an inch, and the workshop cuts from that message. */
  const shareText = estLabel
    ? t('try.share.withSize', { brand: config.brand, name: product.name, size: estLabel })
    : t('try.share.text', { brand: config.brand, name: product.name, size: sizeLabel })

  /* Compose on "Looks right", not on the share tap — see the shareImage import.
     Everything heavy is behind this one await chain, and both modules stay out
     of the route chunk until someone actually finishes a placement. */
  const composeFrom = useCallback(
    async (artSelector: string, keepEstimate = false) => {
    if (!photo || !quadN) return
    if (!source) return
    setComposing(true)
    setComposeErr(false)
    try {
      const [{ rasterizeDoor, loadLeafPhoto, pickLargest }, { composeTryOn }] = await Promise.all([
        import('../lib/doorRaster'),
        import('../lib/compose'),
      ])
      const cq = scaleQuad(quadN, photo.canvas.width, photo.canvas.height)
      const side = (a: number, b: number) => Math.hypot(cq[b].x - cq[a].x, cq[b].y - cq[a].y)
      const rh = Math.round(Math.min(2048, Math.max(700, (side(0, 3) + side(1, 2)) / 2)))

      let leaf: { image: HTMLImageElement; quad: Quad }
      if (source.kind === 'art') {
        /* Rasterise at roughly the size the leaf lands at — the grain filter is
           expensive, and detail finer than the destination is thrown away. The
           *live* node is serialised, so the export is the approved picture. */
        /* The *live* node is serialised rather than re-rendered, so the saved
           picture carries the same gradient ids as the one on screen. Which
           node that is depends on where we are: the place step's warped leaf,
           or — when a finish is switched on the result screen, where no leaf is
           on display — the hidden raster stage mounted for this pass. */
        const live = document.querySelector<SVGSVGElement>(artSelector)
        if (!live) throw new Error('the door artwork is not on screen')
        const rw = Math.round(rh * (cfg.widthIn / cfg.heightIn))
        leaf = { image: await rasterizeDoor(live, rw, rh), quad: rectQuad(rw, rh) }
      } else {
        // The marked corners, in the photograph's own pixels.
        const img = await loadLeafPhoto(source.photo.srcSet ? pickLargest(source.photo.srcSet) : source.photo.src)
        const iw = img.naturalWidth
        const ih = img.naturalHeight
        leaf = { image: img, quad: rectQuad(iw, ih) }
      }

      const blob = await composeTryOn({
        photo: photo.canvas,
        quadN,
        leaf,
        flipped,
        ambient,
        footer: { name: product.name, size: sizeLabel, site: 'patidartimbers.com' },
      })
      /* The outline is a rectangle of known shape seen at an unknown angle, so
         it tells us the door's true proportions — see rectify.ts. One tap on a
         height chip turns that into inches and a price. */
      const est = rectifyAspect(cq, photo.canvas.width, photo.canvas.height)
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url)
      setResult({ blob, url: URL.createObjectURL(blob), ratio: est?.ratio ?? null })
      /* A finish change redraws the same doorway from the same outline, so the
         height the customer already told us still holds. Clearing it would make
         them re-tap a chip to get their size and price back for what is, to
         them, the same door in a different colour. */
      if (!keepEstimate) setEstHeight(null)
      setShared(null)
    } catch {
      setComposeErr(true)
    } finally {
      setComposing(false)
    }
    },
    [photo, quadN, source, flipped, ambient, cfg.widthIn, cfg.heightIn, product.name, sizeLabel],
  )

  /** The place step's "Looks right" — the leaf is on screen, warped. */
  const compose = useCallback(() => {
    void composeFrom('svg.tryd__art')
  }, [composeFrom])

  /**
   * Switching finish.
   *
   * On the place step this is just a re-render: the leaf is live vector under
   * an unchanged `matrix3d`, so a new tone costs nothing. On the *result*
   * screen there is no leaf on display — only a flat composed JPEG — so the
   * picture has to be drawn again, which is what `reTone` schedules.
   */
  const pickTone = useCallback(
    (next: Tone) => {
      if (next.id === tone?.id || composing) return
      setTone(next)
      if (resultRef.current) setReTone(next)
    },
    /* ⚠️ `tone`, never `tone.id`. A dependency array is evaluated on *every*
       render, and `tone` is undefined for anything `tonesFor` returns [] for —
       i.e. every material. Dereferencing it here threw before the doors-only
       refusal below could return, so /try/burmese-teak crashed instead of
       explaining itself. */
    [tone, composing],
  )

  /* Runs after the commit that mounts the hidden raster stage, so the artwork
     is guaranteed to be in the document by the time it is serialised — and
     `composeFrom` has already been rebuilt around the new tone. */
  useEffect(() => {
    if (!reTone) return
    let alive = true
    void composeFrom('.tryre svg', true).finally(() => {
      if (alive) setReTone(null)
    })
    return () => {
      alive = false
    }
  }, [reTone, composeFrom])

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

  /* Doors only — every door, nothing but doors, WPC doors included. `tryState`
     in products.ts owns that rule. The two refusals are worded differently
     because only one of them is temporary: a photographed door is still a
     door, it just has no square-on cutout yet. */
  const state = tryState(product)
  if (state !== 'ready' || !source) {
    return (
      <div className="try try--plain page-pad">
        <h1 className="try__oops">{product.name}</h1>
        <p className="try__note">
          {state === 'no' ? t('try.notADoor', { name: product.name }) : t('try.soon')}
        </p>
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
            {/* The viewfinder can draw the framing guides on the room itself,
                which is where the square-on shot the rectifier needs actually
                gets taken. Where getUserMedia is unavailable — an insecure
                origin, an old browser — the original `capture` input stands in,
                so the control never disappears. */}
            {cameraAvailable() ? (
              <button
                type="button"
                className="btn btn--dark btn--big try__shoot"
                disabled={busy}
                onClick={() => {
                  setCamErr(null)
                  setCam(true)
                }}
              >
                {t('try.pick.take')}
              </button>
            ) : (
              <FileButton className="btn btn--dark btn--big" capture onPick={onPick} busy={busy}>
                {t('try.pick.take')}
              </FileButton>
            )}
            <FileButton className="btn btn--ghost btn--big" onPick={onPick} busy={busy}>
              {t('try.pick.choose')}
            </FileButton>
          </div>
          {/* Appears only where it works, and falls back to nothing — a chunk
              that 404s after a redeploy must not take the photo flow with it. */}
          {arOk && (
            <ErrorBoundary label="ar" fallback={null}>
              <Suspense fallback={null}>
                <ArPlacement
                  source={source}
                  heightIn={cfg.heightIn}
                  widthIn={cfg.widthIn}
                  label={`${product.name} · ${sizeLabel}`}
                />
              </Suspense>
            </ErrorBoundary>
          )}
          <p className="try__privacy">{t('try.pick.privacy')}</p>
          {err && (
            <p className="try__err" role="alert">
              {t(`try.err.${err}`)}
            </p>
          )}
          {camErr && (
            <p className="try__err" role="alert">
              {t(`try.cam.err.${camErr}`)}
            </p>
          )}
        </div>
      ) : result ? (
        <>
          <div className="try__stage">
            <img className={`try__out${composing ? ' is-working' : ''}`} src={result.url} alt="" />
            {/* Only mounted while a finish is being redrawn: ~180 SVG nodes
                under a turbulence filter is not something to keep parked on a
                screen that is otherwise a single flat JPEG. */}
            {reTone && source.kind === 'art' && (
              <div className="tryre" aria-hidden="true">
                <DoorArt art={source.art} tone={source.tone} />
              </div>
            )}
          </div>
          <div className="try__controls">
            {/* The one thing people actually wanted the room view for: the same
                door in a different finish, without going back to the corners. */}
            {tones.length > 1 && (
              <div className="try__finish">
                <p className="try__hint">{composing ? t('try.result.redrawing') : t('try.result.finish')}</p>
                <div className="try__tones">
                  {tones.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      className={`try__tone${x.id === tone?.id ? ' is-on' : ''}`}
                      style={{ background: x.base }}
                      aria-label={x.name}
                      aria-pressed={x.id === tone?.id}
                      disabled={composing}
                      onClick={() => pickTone(x)}
                    />
                  ))}
                </div>
              </div>
            )}
            {result.ratio != null && (
              <div className="try__size">
                <p className="try__hint">{t('try.size.ask')}</p>
                <div className="try__chips">
                  {HEIGHT_CHIPS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      className={`try__chip${estHeight === h ? ' is-on' : ''}`}
                      aria-pressed={estHeight === h}
                      onClick={() => setEstHeight(h)}
                    >
                      {formatFtIn(h)}
                    </button>
                  ))}
                </div>
                {estLabel && (
                  <p className="try__est">
                    <strong>{t('try.size.est', { size: estLabel })}</strong>
                    {estQuote && (
                      <span> · {t('try.size.price', { price: fmtINR(estQuote.total), name: product.name })}</span>
                    )}
                    <span className="try__caveat">{t('try.size.caveat')}</span>
                  </p>
                )}
              </div>
            )}
            {shared === 'downloaded' && <p className="try__hint">{t('try.result.saved')}</p>}
            <button type="button" className="btn btn--dark btn--big try__done" onClick={send}>
              {canShareFiles() ? t('try.result.share') : t('try.result.save')}
            </button>
            <div className="try__actions">
              <button type="button" className="btn btn--ghost" onClick={adjust}>
                {t('try.result.adjust')}
              </button>
              {/* Text-only fallback: wa.me cannot carry the file, so this is a
                  different action from the button above it and has to say so. */}
              <a className="btn btn--ghost" href={whatsappLink(shareText)} target="_blank" rel="noreferrer">
                {canShareFiles() ? t('try.result.chat') : t('try.result.share')}
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
                  source={source}
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
            {/* Finishes are a property of the drawn doors; a photographed leaf
                is whatever it was shot in. */}
            <div className="try__tones">
              {tones.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={`try__tone${x.id === tone?.id ? ' is-on' : ''}`}
                  style={{ background: x.base }}
                  aria-label={x.name}
                  aria-pressed={x.id === tone?.id}
                  onClick={() => pickTone(x)}
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

      {cam && <CameraShot onShot={onShot} onCancel={() => setCam(false)} onFail={onCamFail} />}
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
