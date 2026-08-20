import { useEffect, useMemo, useRef, useState } from 'react'
import { QuadEditor } from '../components/tryathome/QuadEditor'
import { COMMON_SIZES } from '../data/products'
import type { Quad } from '../lib/homography'
import { guessDoorQuad } from '../lib/quadGuess'
import { t } from '../lib/i18n'
import { rectifyAspect } from '../lib/rectify'
import { flipWinding, mirrorQuad, rectifyToCanvas, squareUp } from '../lib/rectifyImage'
import type { DbImage } from './api'
import {
  cropFlip,
  cropQuad,
  humanError,
  isLeafCrop,
  originalUrl,
  uploadCatalog,
  uploadOriginal,
} from './api'

/**
 * Drop a photo → put four corners on the door → upload.
 *
 * The corners are the whole idea. Dragging them onto the leaf does three jobs
 * at once: it crops the door out of the showroom, it removes the camera's tilt
 * (a rectangular crop cannot — crop a photo taken from one side and you still
 * have a lopsided door plus slivers of wall), and it tells us the door's true
 * proportions. What lands in the catalogue is the leaf, head-on, edge to edge.
 *
 * That is also why the storefront needs no cutout step of its own: the picture
 * *is* the door, so the doorway view warps the whole image and is done.
 *
 * ⚠️ This replaced a fixed 3:8 react-easy-crop. That aspect is a 3ft × 8ft
 * leaf, so every 4ft grand entrance had its sides silently trimmed and every
 * 6'6" utility door was stretched. Doors are not one shape; the cropper must
 * not pretend they are.
 */

const WIDTHS = [480, 960]

/** The long edge of what we store. Both widths are derived from the crop's shape. */
const OUT_WIDTH = 960

/**
 * A phone camera roll is the source here, and a modern phone shoots 8–25 MB
 * frames. The cap is generous enough for any real photo and low enough that a
 * mis-picked video or a RAW file is refused before it is pushed up a mobile
 * connection.
 */
const MAX_BYTES = 25 * 1024 * 1024

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

/**
 * Where the handles sit when nothing better is known — most photos have the
 * door somewhere near the middle. `guessDoorQuad` beats this most of the time;
 * see `guessStart`.
 */
const START: Quad = [
  { x: 0.28, y: 0.08 },
  { x: 0.72, y: 0.08 },
  { x: 0.72, y: 0.95 },
  { x: 0.28, y: 0.95 },
]

/**
 * Put the handles on the door before the owner touches anything.
 *
 * Same `guessDoorQuad` the storefront runs on a customer's doorway photo —
 * Sobel column/row energy on a 240px copy, ~5 ms, zero bytes of download. It
 * was wired into `/try` only until 2026-08-20, which was half a feature: the
 * person who crops every door in the catalogue was the one still dragging four
 * handles in from the corners on every upload.
 *
 * ⚠️ The bar is *much* lower here than on the storefront, and that asymmetry is
 * why this is worth doing even though the guess is often wrong. A customer
 * cannot tell a bad guess from a good one — which is why `quadGuess.ts` argues
 * a 60%-accurate detector is worse than none. The shop owner is looking
 * straight at the door in their own photograph with the outline drawn over it:
 * a wrong guess is *obvious* and costs one drag, and a right one saves four.
 * Measured over the 17 catalogue photos: 9 land close enough to accept or
 * nudge, 5 decline outright (→ START, exactly as before), and 3 are visibly
 * wrong — a low-contrast white-on-white door, a double door, and a group shot
 * of three doors, all of which the owner corrects in seconds.
 *
 * It never runs after a drag, and never overrides a saved crop.
 */
function guessStart(img: HTMLImageElement): Quad {
  try {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return START
    ctx.drawImage(img, 0, 0)
    /* `findSill` is on here and off on the storefront — a catalogue photo has
       the whole leaf in frame and an owner who can see whether the line
       landed; see GuessOptions. */
    const g = guessDoorQuad(c, { findSill: true })
    if (!g) return START
    // Back to the normalised space the editor stores; see the `measure` effect.
    const n = (pt: { x: number; y: number }) => ({ x: pt.x / c.width, y: pt.y / c.height })
    return [n(g[0]), n(g[1]), n(g[2]), n(g[3])]
  } catch {
    // A guess is a convenience. It must never be the reason an upload fails.
    return START
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    /* ⚠️ A re-crop reads its source from Supabase storage — a different origin
       — and the rectifier calls getImageData, which throws on a tainted canvas.
       Requesting it anonymously (before `src`, or it has no effect) makes the
       bucket's CORS headers apply. Freshly picked files are blob: URLs and need
       none of this. */
    if (!src.startsWith('blob:') && !src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    // `onerror` hands back an Event, not an Error. Rejecting with it meant the
    // catch below read `.message` off an Event, got undefined, and rendered an
    // empty error box — the failure mode for every HEIC straight off an iPhone.
    img.onerror = () => reject(new Error(t('ax.img.unreadable')))
    img.src = src
  })
}

function toQuad(flat: number[]): Quad {
  return [
    { x: flat[0], y: flat[1] },
    { x: flat[2], y: flat[3] },
    { x: flat[4], y: flat[5] },
    { x: flat[6], y: flat[7] },
  ]
}

function toWebp(canvas: HTMLCanvasElement, width: number): Promise<Blob> {
  const out = document.createElement('canvas')
  out.width = width
  out.height = Math.max(1, Math.round((width * canvas.height) / canvas.width))
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error(t('ax.img.encodeFailed'))
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return new Promise((resolve, reject) =>
    // `toBlob` hands back null when the encoder refuses — a tainted canvas, or
    // an engine without webp. `b!` turned that into a null Blob that uploaded
    // as a zero-byte file and produced a broken image on the live site.
    out.toBlob((b) => (b ? resolve(b) : reject(new Error(t('ax.img.encodeFailed')))), 'image/webp', 0.82),
  )
}

export function ImageDropCrop({
  slug,
  role,
  existing,
  onDone,
  onCancel,
}: {
  slug: string
  role: 'cover' | 'gallery'
  /** Re-cropping an image already on the product, rather than adding a new one. */
  existing?: DbImage
  onDone: (img: DbImage) => void
  onCancel: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [quad, setQuad] = useState<Quad>(START)
  const [square, setSquare] = useState(false)
  /**
   * Mirror the door left-to-right on the way out.
   *
   * `.door-scene__leaf` hinges on `transform-origin: left center`, so every
   * door on the site swings open from its left edge and the handle has to be
   * on the right. Roughly half the doors on a shop floor are hung the other
   * way, and photographing one of those gave a card that swings open *from*
   * the handle. A mirrored leaf is still a truthful picture of the design —
   * which is what the catalogue is selling — so this is a photo problem with a
   * photo fix, not a reason to build a second, right-hinged swing.
   *
   * ⚠️ `quad` stays in the unmirrored photo's coordinates whatever this is.
   * The mirror is applied at exactly two boundaries — the handles on their way
   * to the editor, and the corners on their way to the rectifier — so the
   * saved `crop.quad` still means what it says and toggling this needs no
   * state change at all: the handles simply re-draw where the door now is.
   */
  const [flip, setFlip] = useState(false)
  /** True when re-cropping the saved copy because no original was kept. */
  const [lossy, setLossy] = useState(false)
  const [opening, setOpening] = useState(Boolean(existing))
  /** null = keep the shape the corners imply. Otherwise a width÷height ratio. */
  const [lockRatio, setLockRatio] = useState<number | null>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  /**
   * Set when a *freshly picked* file is waiting for its first paint, so the
   * handles can be dropped onto the door as it appears.
   *
   * Deliberately not armed on the re-crop path: that one either restores the
   * quad the owner last dragged, or — where no original was kept — is looking
   * at the previous crop's *output*, which is already the leaf edge to edge and
   * where a guess would be worse than leaving the handles alone.
   */
  const pendingGuess = useRef(false)
  const [busy, setBusy] = useState(false)
  /** Which of the three uploads is in flight — the originals one is the slow one. */
  const [step, setStep] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  /** Every object URL handed out, so none of them outlives the component. */
  const urls = useRef<string[]>([])
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  /* The editor works in rendered pixels; the quad is stored normalised so it
     survives the stage being resized or the window being rotated. */
  useEffect(() => {
    const el = stageRef.current
    if (!el || !src) return
    const measure = () => {
      const img = el.querySelector('img')
      if (!img) return
      const r = img.getBoundingClientRect()
      if (r.width && r.height) setBox({ w: Math.round(r.width), h: Math.round(r.height) })
      if (img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight })
      /* Once per picked file, and only before the owner has touched anything —
         the ref is cleared here, so a resize or a rotation can never move
         handles that have since been dragged. */
      if (pendingGuess.current && img.naturalWidth) {
        pendingGuess.current = false
        setQuad(guessStart(img))
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const img = el.querySelector('img')
    img?.addEventListener('load', measure)
    return () => {
      ro.disconnect()
      img?.removeEventListener('load', measure)
    }
  }, [src])

  /* Re-crop: reopen the untouched original where one was kept, and put the
     handles back exactly where they were left. Photos seeded before this admin
     existed have no original, so we fall back to the saved copy — which can
     only ever crop further *in*, never restore what a previous crop removed.
     Say so rather than quietly degrading the picture. */
  useEffect(() => {
    if (!existing) return
    let cancelled = false
    ;(async () => {
      try {
        let url = existing.src_960 || existing.src_480
        let fallback = true
        if (existing.original_path) {
          try {
            url = await originalUrl(existing.original_path)
            fallback = false
          } catch {
            // A missing or unreadable original is not fatal — the saved copy works.
          }
        }
        if (cancelled) return
        const saved = cropQuad(existing)
        setSrc(url)
        setLossy(fallback)
        // The saved quad describes the *original*; against the fallback copy it
        // would be meaningless, because that copy is already the cropped result.
        setQuad(saved && !fallback ? toQuad(saved) : START)
        setSquare(!isLeafCrop(existing) && Boolean(existing.crop))
        // The fallback copy is the *output* of the last crop, so it is already
        // mirrored — flipping it again would undo the owner's earlier fix.
        setFlip(!fallback && cropFlip(existing))
      } catch (e) {
        if (!cancelled) setErr(humanError(e))
      } finally {
        if (!cancelled) setOpening(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [existing])

  const onFile = (f: File | undefined) => {
    if (!f) return
    setErr(null)
    // Checked before anything is decoded or uploaded: a wrong file that fails
    // here costs nothing, and the same file failing after a two-minute upload
    // on mobile data costs the whole attempt.
    if (f.type && !f.type.startsWith('image/')) return setErr(t('ax.img.wrongType'))
    if (f.size > MAX_BYTES) {
      return setErr(t('ax.img.tooBig', { size: mb(f.size), max: mb(MAX_BYTES) }))
    }
    setFile(f)
    const u = URL.createObjectURL(f)
    urls.current.push(u)
    setSrc(u)
    // START is what shows if the guess declines or the image never decodes.
    pendingGuess.current = true
    setQuad(START)
    setLockRatio(null)
    setFlip(false)
  }

  /* What shape the corners say the door is. Perspective in the photo is enough
     to recover the real rectangle's proportions — the same solve the storefront
     uses to measure a customer's doorway. */
  const measured = useMemo(() => {
    if (!natural.w || !natural.h) return null
    return rectifyAspect(scale(quad, natural.w, natural.h), natural.w, natural.h)
  }, [quad, natural])

  const ratio = lockRatio ?? measured?.ratio ?? 0.375
  const approx = useMemo(() => nearestSize(ratio), [ratio])

  const save = async () => {
    if (!src || busy) return
    setBusy(true)
    setStep(1)
    setErr(null)
    try {
      const img = await loadImage(src)
      const outH = Math.round(OUT_WIDTH / ratio)
      /* Reversing the corner order is the whole of the mirror — the rectifier
         maps output (0,0) onto `quad[0]`, so handing it the top-*right* corner
         first walks the door out backwards. Same single pass over the pixels. */
      const corners = flip ? flipWinding(quad) : quad
      const flat = rectifyToCanvas(
        img,
        scale(corners, img.naturalWidth, img.naturalHeight),
        OUT_WIDTH,
        outH,
      )

      const folder = slug || 'unfiled'
      const stem = `${folder}/${crypto.randomUUID()}`
      const urlsByWidth: Record<number, string> = {}
      for (const [i, w] of WIDTHS.entries()) {
        setStep(i + 1)
        urlsByWidth[w] = await uploadCatalog(`${stem}-${w}.webp`, await toWebp(flat, w))
      }
      setStep(WIDTHS.length + 1)
      /* A re-crop keeps whatever original is already on file — re-uploading the
         same frame would just orphan a copy. Only a freshly picked file has a
         new original to store. */
      let originalPath = existing?.original_path ?? null
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        originalPath = await uploadOriginal(`${stem}-orig.${ext}`, file)
      }
      onDone({
        ...(existing?.id ? { id: existing.id } : {}),
        role,
        src_480: urlsByWidth[480],
        src_960: urlsByWidth[960],
        width: OUT_WIDTH,
        height: outH,
        original_path: originalPath,
        /* `mode: 'leaf'` is the flag the storefront reads: this picture is the
           door, so the doorway view can warp it whole. Keeping the corners lets
           the crop be re-opened and adjusted later. */
        crop: { mode: square ? 'rect' : 'leaf', quad: flatten(quad), ratio, ...(flip && { flip: true }) },
        sort_order: existing?.sort_order ?? 0,
      })
    } catch (e) {
      setErr(humanError(e))
    } finally {
      setBusy(false)
      setStep(0)
    }
  }

  const total = WIDTHS.length + 1

  return (
    <div className="ax-crop">
      {err && (
        <div className="ax-note ax-note--fault" role="alert">
          {err}
        </div>
      )}
      {opening ? (
        <p className="ax-hint">Opening the original…</p>
      ) : !src ? (
        <label className="ax-drop">
          <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <span>Drop a photo or click to choose</span>
          <small>
            Any angle is fine — you'll put four corners on the door next and we'll straighten it. JPEG or PNG,
            up to {mb(MAX_BYTES)}.
          </small>
        </label>
      ) : (
        <>
          <p className="ax-hint">
            Drag the four corners onto the <strong>door itself</strong> — the leaf, not the frame around it.
            Everything outside them is thrown away.
          </p>
          {lossy && (
            <div className="ax-note">
              No original was kept for this photo, so you're re-cropping the saved copy — you can trim it
              further, but anything an earlier crop removed is gone. Upload the full photo again to start clean.
            </div>
          )}
          {/* The stage shows the photo the way it will be saved, so the mirror
              is a CSS one on the <img> and the handles are mirrored to match.
              `scaleX(-1)` leaves the bounding box alone, so the measurement
              effect above and the editor's coordinate space are untouched. */}
          <div className={`ax-crop__stage${flip ? ' ax-crop__stage--flip' : ''}`} ref={stageRef}>
            <img src={src} alt="" />
            {box.w > 0 && (
              <QuadEditor
                quad={scale(flip ? mirrorQuad(quad, 1) : quad, box.w, box.h)}
                onChange={(next) => {
                  const shown = scale(next, 1 / box.w, 1 / box.h)
                  // `mirrorQuad` is an involution, so the same call carries the
                  // handles back into the unmirrored photo's coordinates.
                  const n = flip ? mirrorQuad(shown, 1) : shown
                  setQuad((prev) => (square ? squareUp(n, prev) : n))
                }}
                width={box.w}
                height={box.h}
                photoUrl={src}
                mirrored={flip}
              />
            )}
          </div>
          <div className="ax-crop__controls">
            <label className="ax-checkbox">
              <input type="checkbox" checked={square} onChange={(e) => setSquare(e.target.checked)} />
              <span>Keep it a plain rectangle (for photos that aren't a door)</span>
            </label>

            <label className="ax-checkbox">
              <input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} />
              <span>
                Flip left to right — <strong>the handle should end up on the right</strong>, because
                doors on the site swing open from their left edge
              </span>
            </label>

            <div className="ax-field">
              <span>
                Shape — measures about <strong>{approx.label}</strong>
                {measured && !measured.fromPerspective && ' (shot straight on)'}
              </span>
              <div className="ax-chips">
                <button
                  type="button"
                  className={`ax-chip${lockRatio === null ? ' is-on' : ''}`}
                  onClick={() => setLockRatio(null)}
                >
                  As drawn
                </button>
                {COMMON_SIZES.map((s) => {
                  const r = s.widthIn / s.heightIn
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`ax-chip${lockRatio === r ? ' is-on' : ''}`}
                      onClick={() => setLockRatio(r)}
                    >
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="ax-row">
              <button type="button" className="ax-btn" disabled={busy} onClick={() => setSrc(null)}>
                Choose another
              </button>
              <button type="button" className="ax-btn ax-btn--primary" disabled={busy} onClick={save}>
                {/* Three round trips, and the last one carries the untouched
                    original. On store wi-fi that is a few seconds; on mobile
                    data it is long enough that a single "Uploading…" reads as a
                    hang and gets the tab closed. */}
                {busy ? t('ax.img.uploading', { step, total }) : 'Use this crop'}
              </button>
            </div>
            {busy && (
              <div className="ax-crop__progress" aria-hidden="true">
                <span style={{ width: `${(step / total) * 100}%` }} />
              </div>
            )}
          </div>
        </>
      )}
      <button type="button" className="ax-link" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}

/** The stock size this shape is closest to, for a readable "about 7′ × 3′". */
function nearestSize(ratio: number): { label: string } {
  let best = COMMON_SIZES[3]
  let diff = Infinity
  for (const s of COMMON_SIZES) {
    const d = Math.abs(s.widthIn / s.heightIn - ratio)
    if (d < diff) {
      diff = d
      best = s
    }
  }
  return best
}

function scale(q: Quad, sx: number, sy: number): Quad {
  return [
    { x: q[0].x * sx, y: q[0].y * sy },
    { x: q[1].x * sx, y: q[1].y * sy },
    { x: q[2].x * sx, y: q[2].y * sy },
    { x: q[3].x * sx, y: q[3].y * sy },
  ]
}

function flatten(q: Quad): number[] {
  return [q[0].x, q[0].y, q[1].x, q[1].y, q[2].x, q[2].y, q[3].x, q[3].y]
}
