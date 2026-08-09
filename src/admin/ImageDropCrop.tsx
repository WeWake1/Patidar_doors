import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { t } from '../lib/i18n'
import type { DbImage } from './api'
import { humanError, uploadCatalog, uploadOriginal } from './api'

/** Door-leaf aspect (3ft × 8ft) — what the cards frame. */
const ASPECT = 3 / 8
const WIDTHS = [480, 960]

/**
 * A phone camera roll is the source here, and a modern phone shoots 8–25 MB
 * frames. The cap is generous enough for any real photo and low enough that a
 * mis-picked video or a RAW file is refused before it is pushed up a mobile
 * connection.
 */
const MAX_BYTES = 25 * 1024 * 1024

const mb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    // `onerror` hands back an Event, not an Error. Rejecting with it meant the
    // catch below read `.message` off an Event, got undefined, and rendered an
    // empty error box — the failure mode for every HEIC straight off an iPhone.
    img.onerror = () => reject(new Error(t('ax.img.unreadable')))
    img.src = src
  })
}

async function cropToWebp(img: HTMLImageElement, area: Area, width: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round(width / ASPECT)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error(t('ax.img.encodeFailed'))
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    // `toBlob` hands back null when the encoder refuses — a tainted canvas, or
    // an engine without webp. `b!` turned that into a null Blob that uploaded
    // as a zero-byte file and produced a broken image on the live site.
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(t('ax.img.encodeFailed')))), 'image/webp', 0.82),
  )
}

/**
 * Drop a photo → frame it to the door-leaf ratio → upload. Emits a DbImage
 * (480/960 webp public URLs + the crop box, so it can be re-opened later).
 */
export function ImageDropCrop({
  slug,
  role,
  onDone,
  onCancel,
}: {
  slug: string
  role: 'cover' | 'gallery'
  onDone: (img: DbImage) => void
  onCancel: () => void
}) {
  const [src, setSrc] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)
  /** Which of the three uploads is in flight — the originals one is the slow one. */
  const [step, setStep] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  /** Every object URL handed out, so none of them outlives the component. */
  const urls = useRef<string[]>([])

  useEffect(
    () => () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  const openFile = (u: string) => {
    urls.current.push(u)
    setSrc(u)
  }

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
    openFile(URL.createObjectURL(f))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  const onCropComplete = useCallback((_a: Area, px: Area) => setArea(px), [])

  const save = async () => {
    if (!src || !area || !file || busy) return
    setBusy(true)
    setStep(1)
    setErr(null)
    try {
      const img = await loadImage(src)
      const folder = slug || 'unfiled'
      const stem = `${folder}/${crypto.randomUUID()}`
      const urlsByWidth: Record<number, string> = {}
      for (const [i, w] of WIDTHS.entries()) {
        setStep(i + 1)
        const blob = await cropToWebp(img, area, w)
        urlsByWidth[w] = await uploadCatalog(`${stem}-${w}.webp`, blob)
      }
      setStep(WIDTHS.length + 1)
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const originalPath = await uploadOriginal(`${stem}-orig.${ext}`, file)
      onDone({
        role,
        src_480: urlsByWidth[480],
        src_960: urlsByWidth[960],
        width: 960,
        height: Math.round(960 / ASPECT),
        original_path: originalPath,
        crop: { ...area, zoom },
        sort_order: 0,
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
      {!src ? (
        <label className="ax-drop">
          <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <span>Drop a photo or click to choose</span>
          <small>Straight-on shots frame best. You'll position it next. JPEG or PNG, up to {mb(MAX_BYTES)}.</small>
        </label>
      ) : (
        <>
          <div className="ax-crop__stage">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              restrictPosition={false}
            />
          </div>
          <div className="ax-crop__controls">
            <label>
              Zoom
              <input type="range" min={0.5} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            </label>
            <div className="ax-row">
              <button type="button" className="ax-btn" disabled={busy} onClick={() => setSrc(null)}>
                Choose another
              </button>
              <button type="button" className="ax-btn ax-btn--primary" disabled={busy || !area} onClick={save}>
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
