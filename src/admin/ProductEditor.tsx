import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { WorldId } from '../data/products'
import { WORLDS } from '../data/worlds'
import { ProductVisual } from '../components/ProductVisual'
import type { DbImage, DbProduct, DbSubcategory } from './api'
import {
  createSubcategory,
  getProduct,
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
  presentation: 'showcase',
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
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    listSubcategories().then(setSubs).catch((e) => setErr(String(e)))
    if (id) getProduct(id).then((d) => { if (d) setP(d); setLoading(false) })
  }, [id])

  const worldSubs = useMemo(() => subs.filter((s) => s.world === p.world), [subs, p.world])
  const subName = subs.find((s) => s.id === p.subcategory_id)?.name ?? ''
  const set = (patch: Partial<DbProduct>) => setP((prev) => ({ ...prev, ...patch }))

  const cover = p.images?.find((i) => i.role === 'cover')
  const gallery = p.images?.filter((i) => i.role === 'gallery') ?? []

  async function addSection() {
    const name = window.prompt(`New section under ${p.world}:`)
    if (!name?.trim()) return
    const created = await createSubcategory(p.world, name.trim())
    setSubs((s) => [...s, created])
    set({ subcategory_id: created.id })
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

  async function onSave() {
    setErr(null)
    if (!p.name.trim()) return setErr('Name is required.')
    if (!p.subcategory_id) return setErr('Pick a section.')
    setSaving(true)
    try {
      await saveProduct({ ...p, slug: p.slug || slugify(p.name) })
      navigate('/admin')
    } catch (e) {
      setErr(String((e as Error).message ?? e))
      setSaving(false)
    }
  }

  if (loading) return <div className="ax-pad">Loading…</div>

  const preview = toPreviewProduct({ ...p, slug: p.slug || slugify(p.name) }, subName || 'Section')

  return (
    <div className="ax-editor">
      <div className="ax-editor__form">
        <button type="button" className="ax-link" onClick={() => navigate('/admin')}>← Back</button>
        <h1>{isNew ? 'New product' : p.name}</h1>
        {err && <div className="ax-error">{err}</div>}

        <label className="ax-field">
          <span>Name</span>
          <input value={p.name} onChange={(e) => set({ name: e.target.value, ...(isNew ? { slug: slugify(e.target.value) } : {}) })} />
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
          <input value={p.tag} onChange={(e) => set({ tag: e.target.value })} />
        </label>

        <label className="ax-field">
          <span>Story (optional)</span>
          <textarea rows={3} value={p.story ?? ''} onChange={(e) => set({ story: e.target.value || null })} />
        </label>

        <div className="ax-field">
          <span>Specs</span>
          {p.specs.map((s, i) => (
            <div key={i} className="ax-row">
              <input value={s} onChange={(e) => set({ specs: p.specs.map((x, j) => (j === i ? e.target.value : x)) })} />
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
              <input type="number" value={p.price ?? ''} onChange={(e) => set({ price: e.target.value ? Number(e.target.value) : null })} />
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
          {cover ? (
            <div className="ax-thumb">
              <img src={cover.src_480} alt="" />
              <button type="button" className="ax-btn" onClick={() => removeImage(cover)}>Remove</button>
            </div>
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
                <button type="button" className="ax-btn" onClick={() => removeImage(g)}>✕</button>
              </div>
            ))}
          </div>
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
