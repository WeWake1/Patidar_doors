import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import type { DbImage } from './api'
import { uploadCatalog, uploadOriginal } from './api'

/** Door-leaf aspect (3ft × 8ft) — what the cards frame. */
const ASPECT = 3 / 8
const WIDTHS = [480, 960]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function cropToWebp(img: HTMLImageElement, area: Area, width: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.round(width / ASPECT)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/webp', 0.82))
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
  const [err, setErr] = useState<string | null>(null)

  const onFile = (f: File | undefined) => {
    if (!f) return
    setFile(f)
    setSrc(URL.createObjectURL(f))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  const onCropComplete = useCallback((_a: Area, px: Area) => setArea(px), [])

  const save = async () => {
    if (!src || !area || !file) return
    setBusy(true)
    setErr(null)
    try {
      const img = await loadImage(src)
      const folder = slug || 'unfiled'
      const stem = `${folder}/${crypto.randomUUID()}`
      const urls: Record<number, string> = {}
      for (const w of WIDTHS) {
        const blob = await cropToWebp(img, area, w)
        urls[w] = await uploadCatalog(`${stem}-${w}.webp`, blob)
      }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const originalPath = await uploadOriginal(`${stem}-orig.${ext}`, file)
      onDone({
        role,
        src_480: urls[480],
        src_960: urls[960],
        width: 960,
        height: Math.round(960 / ASPECT),
        original_path: originalPath,
        crop: { ...area, zoom },
        sort_order: 0,
      })
    } catch (e) {
      setErr((e as Error).message ?? 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ax-crop">
      {err && <div className="ax-error">{err}</div>}
      {!src ? (
        <label className="ax-drop">
          <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <span>Drop a photo or click to choose</span>
          <small>Straight-on shots frame best. You'll position it next.</small>
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
                {busy ? 'Uploading…' : 'Use this crop'}
              </button>
            </div>
          </div>
        </>
      )}
      <button type="button" className="ax-link" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
