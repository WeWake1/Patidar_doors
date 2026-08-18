import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { WorldId } from '../data/products'
import { WORLDS } from '../data/worlds'
import { ProductVisual } from '../components/ProductVisual'
import { t } from '../lib/i18n'
import type { DbImage, DbProduct, DbSubcategory } from './api'
import {
  createSubcategory,
  getProduct,
  humanError,
  isLeafCrop,
  listSubcategories,
  saveProduct,
  toPreviewProduct,
} from './api'
import { ImageDropCrop } from './ImageDropCrop'


const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const BLANK: DbProduct = {
  slug: '',
  name: '',
  world: 'doors',
  subcategory_id: '',
  tag: '',
  story: null,
  specs: [],
  purchasable: false,
  price: null,
  price_unit: 'leaf',
  presentation: 'swing',
  sort_order: 500,
  published: true,
  images: [],
}

export function ProductEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [p, setP] = useState<DbProduct>(BLANK)
  const [subs, setSubs] = useState<DbSubcategory[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState<false | 'cover' | 'gallery'>(false)
  /** The image being re-cropped, if any — reopens the cropper on the original. */
  const [recrop, setRecrop] = useState<DbImage | null>(null)

  const [err, setErr] = useState<string | null>(null)
  /** A failure to *load* — recoverable by retrying, unlike a save error. */
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  /** Set on the first edit; cleared on save. Guards the two ways out. */
  const dirty = useRef(false)

  const load = useCallback(async () => {
    setLoadErr(null)
    setMissing(false)
    setLoading(Boolean(id))
    try {
      // Both or neither. If the product loaded but the section list didn't,
      // the world/section selects would render silently empty and saving from
      // there would clear the product's section.
      const [ss, d] = await Promise.all([listSubcategories(), id ? getProduct(id) : Promise.resolve(null)])
      setSubs(ss)
      if (id) {
        if (d) setP(d)
        else setMissing(true)
      }
    } catch (e) {
      // Without this catch a rejected fetch left `loading` true forever and the
      // editor sat on "Loading…" with no way out but the browser's back button.
      setLoadErr(humanError(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  /**
   * The browser-level guard. The in-app one is on the Back button below; this
   * covers a closed tab, a reload and a typed URL, which is how a form full of
   * a morning's cataloguing actually gets lost.
   */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  function leave() {
    if (dirty.current && !window.confirm(t('ax.unsaved'))) return
    navigate('/admin')
  }

  const worldSubs = useMemo(() => subs.filter((s) => s.world === p.world), [subs, p.world])
  const subName = subs.find((s) => s.id === p.subcategory_id)?.name ?? ''
  const set = (patch: Partial<DbProduct>) => {
    dirty.current = true
    setP((prev) => ({ ...prev, ...patch }))
  }

  const cover = p.images?.find((i) => i.role === 'cover')
  const gallery = p.images?.filter((i) => i.role === 'gallery') ?? []

  async function addSection() {
    const name = window.prompt(`New section under ${p.world}:`)
    if (!name?.trim()) return
    setErr(null)
    try {
      const created = await createSubcategory(p.world, name.trim())
      setSubs((s) => [...s, created])
      set({ subcategory_id: created.id })
    } catch (e) {
      // Unhandled before: a duplicate name or a blocked write rejected into
      // nothing and the new section simply never appeared in the dropdown.
      setErr(humanError(e))
    }
  }

  function onImage(img: DbImage) {
    if (img.role === 'cover') {
      set({ images: [{ ...img, role: 'cover' }, ...gallery] })
    } else {
      set({ images: [...(p.images ?? []), img] })
    }
    setAdding(false)
  }

  function removeImage(target: DbImage) {
    set({ images: (p.images ?? []).filter((i) => i !== target) })
  }

  /** Swap a re-cropped image in where the old one sat, keeping its place. */
  function replaceImage(target: DbImage, next: DbImage) {
    set({
      images: (p.images ?? []).map((i) => (i === target ? { ...next, role: target.role } : i)),
    })
    setRecrop(null)
  }

  async function onSave() {
    setErr(null)
    if (!p.name.trim()) return setErr('Name is required.')
    if (!p.subcategory_id) return setErr('Pick a section.')
    if (p.purchasable && (p.price === null || !Number.isFinite(p.price) || p.price < 0)) {
      return setErr('Enter a price, or untick “Sell online”.')
    }
    setSaving(true)
    try {
      // Blank spec rows are what an interrupted "+ Add spec" leaves behind, and
      // they render as empty bullets on the product page.
      const specs = p.specs.map((s) => s.trim()).filter(Boolean)
      await saveProduct({ ...p, specs, slug: p.slug || slugify(p.name) })
      dirty.current = false
      // The editor closes on save, so the confirmation has to travel with the
      // navigation — otherwise the only signal a non-technical owner gets that
      // the save landed is the page changing.
      navigate('/admin', { state: { saved: p.name.trim() } })
    } catch (e) {
      setErr(t('ax.saveFailed', { detail: humanError(e) }))
      setSaving(false)
    }
  }

  if (loading) return <div className="ax-pad">{t('ax.loading')}</div>
  if (loadErr) {
    return (
      <div className="ax-pad ax-state ax-state--fault" role="alert">
        <p>{t('ax.loadFailed', { detail: loadErr })}</p>
        <div className="ax-row">
          <button type="button" className="ax-btn ax-btn--primary" onClick={load}>
            {t('ax.retry')}
          </button>
          <button type="button" className="ax-btn" onClick={() => navigate('/admin')}>
            {t('ax.backToCatalogue')}
          </button>
        </div>
      </div>
    )
  }
  if (missing) {
    return (
      <div className="ax-pad ax-state">
        <p>That product no longer exists — it may have been deleted from another device.</p>
        <button type="button" className="ax-btn ax-btn--primary" onClick={() => navigate('/admin')}>
          {t('ax.backToCatalogue')}
        </button>
      </div>
    )
  }

  const preview = toPreviewProduct({ ...p, slug: p.slug || slugify(p.name) }, subName || 'Section')

  return (
    <div className="ax-editor">
      <div className="ax-editor__form">
        <button type="button" className="ax-link" onClick={leave}>← Back</button>
        <h1>{isNew ? 'New product' : p.name}</h1>
        {err && <div className="ax-note ax-note--fault">{err}</div>}

        <label className="ax-field">
          <span>Name</span>
          <input
            maxLength={120}
            value={p.name}
            onChange={(e) => set({ name: e.target.value, ...(isNew ? { slug: slugify(e.target.value) } : {}) })}
          />
        </label>

        <div className="ax-grid2">
          <label className="ax-field">
            <span>World</span>
            <select value={p.world} onChange={(e) => set({ world: e.target.value as WorldId, subcategory_id: '' })}>
              {WORLDS.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <label className="ax-field">
            <span>Section</span>
            <div className="ax-row">
              <select value={p.subcategory_id} onChange={(e) => set({ subcategory_id: e.target.value })}>
                <option value="">— choose —</option>
                {worldSubs.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button type="button" className="ax-btn" onClick={addSection}>+ New</button>
            </div>
          </label>
        </div>

        <label className="ax-field">
          <span>One-line description</span>
          <input maxLength={160} value={p.tag} onChange={(e) => set({ tag: e.target.value })} />
        </label>

        <label className="ax-field">
          <span>Story (optional)</span>
          <textarea maxLength={1200} rows={3} value={p.story ?? ''} onChange={(e) => set({ story: e.target.value || null })} />
        </label>

        <div className="ax-field">
          <span>Specs</span>
          {p.specs.map((s, i) => (
            <div key={i} className="ax-row">
              <input maxLength={200} value={s} onChange={(e) => set({ specs: p.specs.map((x, j) => (j === i ? e.target.value : x)) })} />
              <button type="button" className="ax-btn" onClick={() => set({ specs: p.specs.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <button type="button" className="ax-btn" onClick={() => set({ specs: [...p.specs, ''] })}>+ Add spec</button>
        </div>

        {cover && (
          <div className="ax-field">
            <span>Card animation</span>
            <div className="ax-row">
              <label className="ax-radio">
                <input type="radio" checked={p.presentation === 'swing'} onChange={() => set({ presentation: 'swing' })} />
                Swings open (clean, straight-on leaf)
              </label>
              <label className="ax-radio">
                <input type="radio" checked={p.presentation === 'showcase'} onChange={() => set({ presentation: 'showcase' })} />
                Zoom (in-situ / room photo)
              </label>
            </div>
          </div>
        )}

        <label className="ax-checkbox">
          <input type="checkbox" checked={p.purchasable} onChange={(e) => set({ purchasable: e.target.checked })} />
          Sell online (show price + cart)
        </label>
        {p.purchasable && (
          <div className="ax-grid2">
            <label className="ax-field">
              <span>Price (₹, base 8′×3′)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={p.price ?? ''}
                onChange={(e) => set({ price: e.target.value ? Math.max(0, Number(e.target.value)) : null })}
              />
            </label>
            <label className="ax-field">
              <span>Unit</span>
              <select value={p.price_unit ?? 'leaf'} onChange={(e) => set({ price_unit: e.target.value })}>
                <option value="leaf">per leaf</option>
                <option value="cft">per cft</option>
                <option value="sqft">per sqft</option>
                <option value="sheet">per sheet</option>
              </select>
            </label>
          </div>
        )}

        <label className="ax-checkbox">
          <input type="checkbox" checked={p.published} onChange={(e) => set({ published: e.target.checked })} />
          Published (visible on the site)
        </label>

        {/* images */}
        <div className="ax-field">
          <span>Main photo</span>
          {recrop && recrop.role === 'cover' ? (
            <ImageDropCrop
              slug={p.slug || slugify(p.name)}
              role="cover"
              existing={recrop}
              onDone={(img) => replaceImage(recrop, img)}
              onCancel={() => setRecrop(null)}
            />
          ) : cover ? (
            <>
              <div className="ax-thumb">
                <img src={cover.src_480} alt="" />
                <div className="ax-row">
                  <button type="button" className="ax-btn" onClick={() => setRecrop(cover)}>Re-crop</button>
                  <button type="button" className="ax-btn" onClick={() => removeImage(cover)}>Remove</button>
                </div>
              </div>
              {/* Status, not a task. Cropping with the corner tool is what makes
                  a door usable in the doorway view, so this only reports what
                  the crop already decided. Doors only — a timber or ply swatch
                  has no leaf. */}
              {p.world !== 'timbers' && p.world !== 'ply' && (
                <p className="ax-hint">
                  {isLeafCrop(cover)
                    ? 'Doorway view ✓ — customers can see this door in their own home.'
                    : 'Doorway view — not yet. Re-crop this photo with the four corners on the door itself.'}
                </p>
              )}
            </>
          ) : adding === 'cover' ? (
            <ImageDropCrop slug={p.slug || slugify(p.name)} role="cover" onDone={onImage} onCancel={() => setAdding(false)} />
          ) : (
            <button type="button" className="ax-btn" onClick={() => setAdding('cover')}>+ Add main photo</button>
          )}
        </div>

        <div className="ax-field">
          <span>Gallery</span>
          <div className="ax-thumbs">
            {gallery.map((g, i) => (
              <div key={i} className="ax-thumb ax-thumb--sm">
                <img src={g.src_480} alt="" />
                <div className="ax-row">
                  <button type="button" className="ax-btn" onClick={() => setRecrop(g)} title="Re-crop">✎</button>
                  <button type="button" className="ax-btn" onClick={() => removeImage(g)} title="Remove">✕</button>
                </div>
              </div>
            ))}
          </div>
          {recrop && recrop.role === 'gallery' && (
            <ImageDropCrop
              slug={p.slug || slugify(p.name)}
              role="gallery"
              existing={recrop}
              onDone={(img) => replaceImage(recrop, img)}
              onCancel={() => setRecrop(null)}
            />
          )}
          {adding === 'gallery' ? (
            <ImageDropCrop slug={p.slug || slugify(p.name)} role="gallery" onDone={onImage} onCancel={() => setAdding(false)} />
          ) : (
            <button type="button" className="ax-btn" onClick={() => setAdding('gallery')}>+ Add gallery photo</button>
          )}
        </div>

        <div className="ax-actions">
          <button type="button" className="ax-btn ax-btn--primary" disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* live preview */}
      <div className="ax-editor__preview">
        <div className="ax-preview-label">Live preview — hover the card</div>
        <div className="card ax-preview-card">
          <div className={`card__stage${preview.visual.kind === 'material' ? ' card__stage--material' : ''}`}>
            <ProductVisual product={preview} />
          </div>
          <div className="card__body">
            <div className="card__cat">{WORLDS.find((w) => w.id === preview.world)?.name} · {subName || 'Section'}</div>
            <h3 className="card__name">{preview.name}</h3>
            <p className="card__tag">{preview.tag}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
