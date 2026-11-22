import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { WorldId } from '../data/products'
import { isDoorProduct, isFullBleedVisual, placeholderHeadline } from '../data/products'
import { WORLDS } from '../data/worlds'
import { ProductVisual } from '../components/ProductVisual'
import type { PriceBook } from '../data/pricing'
import { parsePriceBook } from '../data/pricing'
import { t } from '../lib/i18n'
import type { DbImage, DbProduct, DbSubcategory } from './api'
import {
  createSubcategory,
  getPriceBook,
  getProduct,
  humanError,
  isLeafCrop,
  listSubcategories,
  saveProduct,
  toPreviewProduct,
} from './api'
import { ImageDropCrop } from './ImageDropCrop'
import { PricingCard } from './PricingCard'
import { QuotePreview } from './QuotePreview'
import { Card, Field, Notice, Switch } from './ui'
import { useDirty } from './useDirty'

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const WORLD_IDS = WORLDS.map((w) => w.id)

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
  pricing: null,
  presentation: 'swing',
  sort_order: 500,
  published: true,
  images: [],
}

/** What a product with no online price says on its card, by world. */
const UNIT_BY_WORLD: Record<WorldId, string> = { timbers: 'cft', doors: 'leaf', ply: 'sheet', wpc: 'sheet' }

export function ProductEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id
  const [p, setP] = useState<DbProduct>(() => {
    const w = params.get('world')
    return (WORLD_IDS as string[]).includes(w ?? '')
      ? { ...BLANK, world: w as WorldId, price_unit: UNIT_BY_WORLD[w as WorldId] }
      : BLANK
  })
  const [subs, setSubs] = useState<DbSubcategory[]>([])
  const [book, setBook] = useState<PriceBook>(() => parsePriceBook(null))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState<false | 'cover' | 'gallery'>(false)
  /** The image being re-cropped, if any — reopens the cropper on the original. */
  const [recrop, setRecrop] = useState<DbImage | null>(null)

  const [err, setErr] = useState<string | null>(null)
  /** A failure to *load* — recoverable by retrying, unlike a save error. */
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const { dirty, touch, clean, confirmLeave } = useDirty()

  const load = useCallback(async () => {
    setLoadErr(null)
    setMissing(false)
    setLoading(true)
    try {
      // All or nothing. If the product loaded but the section list didn't,
      // the world/section selects would render silently empty and saving from
      // there would clear the product's section. The price book is the one
      // exception: it has a default to fall back on, and a door's rate card
      // must be editable even if the book's read fails.
      const [ss, d, pb] = await Promise.all([
        listSubcategories(),
        id ? getProduct(id) : Promise.resolve(null),
        getPriceBook().catch(() => null),
      ])
      setSubs(ss)
      if (pb) setBook(pb.book)
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

  function leave() {
    if (!confirmLeave()) return
    navigate(`/admin?world=${p.world}`)
  }

  const worldSubs = useMemo(() => subs.filter((s) => s.world === p.world), [subs, p.world])
  const subName = subs.find((s) => s.id === p.subcategory_id)?.name ?? ''
  /**
   * Everything door-shaped in this form hangs off this one answer, so a stack
   * of teak or a sheet of ply is never asked which way its handle faces or
   * what its 32 mm costs. Timbers and ply are never doors; WPC is decided by
   * its section, which is why the hint below says so out loud — it is the only
   * thing on the page that explains why the controls changed. See `isDoorProduct`.
   */
  const isDoor = isDoorProduct(p.world, subName)
  const set = (patch: Partial<DbProduct>) => {
    touch()
    setP((prev) => ({ ...prev, ...patch }))
  }

  const cover = p.images?.find((i) => i.role === 'cover')
  const gallery = p.images?.filter((i) => i.role === 'gallery') ?? []

  async function addSection() {
    const name = window.prompt(`New section under ${WORLDS.find((w) => w.id === p.world)?.name}:`)
    if (!name?.trim()) return
    setErr(null)
    try {
      const created = await createSubcategory(p.world, name.trim())
      setSubs((s) => [...s, created])
      set({ subcategory_id: created.id })
    } catch (e) {
      setErr(humanError(e))
    }
  }

  function onImage(img: DbImage) {
    if (img.role === 'cover') set({ images: [{ ...img, role: 'cover' }, ...gallery] })
    else set({ images: [...(p.images ?? []), img] })
    setAdding(false)
  }

  function removeImage(target: DbImage) {
    set({ images: (p.images ?? []).filter((i) => i !== target) })
  }

  /** Swap a re-cropped image in where the old one sat, keeping its place. */
  function replaceImage(target: DbImage, next: DbImage) {
    set({ images: (p.images ?? []).map((i) => (i === target ? { ...next, role: target.role } : i)) })
    setRecrop(null)
  }

  async function onSave() {
    setErr(null)
    if (!p.name.trim()) return setErr('Name is required.')
    if (!p.subcategory_id) return setErr('Pick a section.')
    // Asked for here rather than enforced downstream: the build-time fetcher
    // used to *drop* a product with no one-liner, so a door saved without one
    // vanished from the site with nothing anywhere to say why.
    if (!p.tag.trim()) return setErr('Add the one-line description — it is the line under the name on every card.')
    const selling = isDoor && p.purchasable
    if (selling) {
      if (!p.pricing || p.pricing.base <= 0) return setErr('Enter the rate, or switch “Selling online” off.')
      for (const g of p.pricing.groups) {
        if (!g.label.trim()) return setErr('Every option needs a name — or remove it.')
        if (g.choices.some((c) => !c.label.trim())) return setErr(`Every choice under “${g.label}” needs a name — or remove it.`)
      }
    }
    setSaving(true)
    try {
      // Blank spec rows are what an interrupted "+ Add spec" leaves behind, and
      // they render as empty bullets on the product page. A non-door can never
      // sell online, whatever the row says — the configurator is a door
      // configurator.
      const specs = p.specs.map((s) => s.trim()).filter(Boolean)
      await saveProduct({
        ...p,
        specs,
        slug: p.slug || slugify(p.name),
        purchasable: selling,
        pricing: selling ? p.pricing : null,
      })
      clean()
      // The editor closes on save, so the confirmation has to travel with the
      // navigation — otherwise the only signal a non-technical owner gets that
      // the save landed is the page changing.
      navigate(`/admin?world=${p.world}`, { state: { saved: p.name.trim() } })
    } catch (e) {
      setErr(t('ax.saveFailed', { detail: humanError(e) }))
      setSaving(false)
    }
  }

  if (loading) return <div className="ax-page ax-muted">{t('ax.loading')}</div>
  if (loadErr) {
    return (
      <div className="ax-page">
        <div className="ax-state ax-state--fault" role="alert">
          <p>{t('ax.loadFailed', { detail: loadErr })}</p>
          <div className="ax-row">
            <button type="button" className="ax-btn ax-btn--primary" onClick={load}>
              {t('ax.retry')}
            </button>
            <Link to="/admin" className="ax-btn">
              {t('ax.backToCatalogue')}
            </Link>
          </div>
        </div>
      </div>
    )
  }
  if (missing) {
    return (
      <div className="ax-page">
        <div className="ax-state">
          <p>That product no longer exists — it may have been deleted from another device.</p>
          <Link to="/admin" className="ax-btn ax-btn--primary">
            {t('ax.backToCatalogue')}
          </Link>
        </div>
      </div>
    )
  }

  const preview = toPreviewProduct({ ...p, slug: p.slug || slugify(p.name) }, subName || 'Section')
  const worldName = WORLDS.find((w) => w.id === p.world)?.name
  const cropperSlug = p.slug || slugify(p.name) || 'unfiled'

  return (
    <div className="ax-page ax-editor">
      <header className="ax-page__head ax-editor__head">
        <div>
          <button type="button" className="ax-link ax-back" onClick={leave}>
            ← Catalogue
          </button>
          <h1 className="ax-title">{isNew ? 'New product' : p.name || 'Untitled'}</h1>
          <p className="ax-page__sub">
            {worldName}
            {subName ? ` · ${subName}` : ''}
            {!p.published && ' · hidden from the site'}
          </p>
        </div>
      </header>

      {err && (
        <Notice kind="fault" role="alert">
          {err}
        </Notice>
      )}

      <div className="ax-editor__grid">
        <div className="ax-editor__form">
          <Card title="Basics" sub="What the card says and where it sits.">
            <Field label="Name">
              <input
                maxLength={120}
                value={p.name}
                placeholder="e.g. Burma Teak Door"
                onChange={(e) => set({ name: e.target.value, ...(isNew ? { slug: slugify(e.target.value) } : {}) })}
              />
            </Field>

            <div className="ax-grid2">
              <Field label="World">
                <select value={p.world} onChange={(e) => set({ world: e.target.value as WorldId, subcategory_id: '', price_unit: UNIT_BY_WORLD[e.target.value as WorldId] })}>
                  {WORLDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Section" as="div">
                <div className="ax-row">
                  <select value={p.subcategory_id} onChange={(e) => set({ subcategory_id: e.target.value })} aria-label="Section">
                    <option value="">— choose —</option>
                    {worldSubs.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="ax-btn" onClick={addSection}>
                    + New
                  </button>
                </div>
              </Field>
            </div>

            <Field label="One-line description" hint="The line under the name on every card.">
              <input maxLength={160} value={p.tag} onChange={(e) => set({ tag: e.target.value })} />
            </Field>

            <Field label="Story" hint="Optional. A paragraph on the product page.">
              <textarea maxLength={1200} rows={3} value={p.story ?? ''} onChange={(e) => set({ story: e.target.value || null })} />
            </Field>

            {/* The controls this form *removed* need explaining more than the
                ones it shows, and for WPC the reason is a section name the
                client can edit — so say which way it read the section. */}
            {!isDoor && (p.world !== 'wpc' || subName) && (
              <p className="ax-hint">
                Not a door —{' '}
                {p.world === 'wpc' ? `“${subName}” is a WPC section that isn’t doors` : `${worldName} isn’t doors`}, so its photo
                shows as a plain picture filling the card and it is priced on enquiry.{' '}
                {p.world === 'wpc' ? 'Name a section “… Doors” and everything in it is treated as a door.' : 'Move it to Doors if it is one.'}
              </p>
            )}
          </Card>

          <Card title="Photos" sub={isDoor ? 'The main photo is the door on its card; crop it with the four corners on the leaf.' : 'The main photo fills the card.'}>
            <div className="ax-photos">
              <div className="ax-field__label">Main photo</div>
              {recrop && recrop.role === 'cover' ? (
                <ImageDropCrop slug={cropperSlug} role="cover" existing={recrop} isDoor={isDoor} onDone={(img) => replaceImage(recrop, img)} onCancel={() => setRecrop(null)} />
              ) : cover ? (
                <>
                  <div className="ax-thumb">
                    <img src={cover.src_480} alt="" width={60} height={80} />
                    <div className="ax-row">
                      <button type="button" className="ax-btn ax-btn--sm" onClick={() => setRecrop(cover)}>
                        Re-crop
                      </button>
                      <button type="button" className="ax-btn ax-btn--sm ax-btn--quiet" onClick={() => removeImage(cover)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  {/* Status, not a task. Cropping with the corner tool is what
                      makes a door usable in the doorway view, so this only
                      reports what the crop already decided. */}
                  {isDoor && (
                    <p className={`ax-hint${isLeafCrop(cover) ? ' ax-hint--ok' : ''}`}>
                      {isLeafCrop(cover)
                        ? 'Doorway view ✓ — customers can see this door in their own home.'
                        : 'Doorway view — not yet. Re-crop this photo with the four corners on the door itself.'}
                    </p>
                  )}
                </>
              ) : adding === 'cover' ? (
                <ImageDropCrop slug={cropperSlug} role="cover" isDoor={isDoor} onDone={onImage} onCancel={() => setAdding(false)} />
              ) : (
                <button type="button" className="ax-btn" onClick={() => setAdding('cover')}>
                  + Add main photo
                </button>
              )}
            </div>

            <div className="ax-photos">
              <div className="ax-field__label">Gallery</div>
              {gallery.length > 0 && (
                <div className="ax-thumbs">
                  {gallery.map((g, i) => (
                    <div key={i} className="ax-thumb ax-thumb--sm">
                      <img src={g.src_480} alt="" width={54} height={72} />
                      <div className="ax-thumb__actions">
                        <button type="button" className="ax-ib" onClick={() => setRecrop(g)} aria-label="Re-crop">
                          ✎
                        </button>
                        <button type="button" className="ax-ib" onClick={() => removeImage(g)} aria-label="Remove">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {recrop && recrop.role === 'gallery' && (
                <ImageDropCrop slug={cropperSlug} role="gallery" existing={recrop} isDoor={isDoor} onDone={(img) => replaceImage(recrop, img)} onCancel={() => setRecrop(null)} />
              )}
              {adding === 'gallery' ? (
                <ImageDropCrop slug={cropperSlug} role="gallery" isDoor={isDoor} onDone={onImage} onCancel={() => setAdding(false)} />
              ) : (
                <button type="button" className="ax-btn" onClick={() => setAdding('gallery')}>
                  + Add gallery photo
                </button>
              )}
            </div>
          </Card>

          <Card title="On the site" sub="How the card behaves, and whether it shows at all.">
            {cover && isDoor && (
              <Field label="Card animation" as="div">
                <div className="ax-radios">
                  <label className="ax-radio">
                    <input type="radio" name="presentation" checked={p.presentation !== 'showcase' && p.presentation !== 'still'} onChange={() => set({ presentation: 'swing' })} />
                    <span>
                      Swings open <em>clean, straight-on leaf</em>
                    </span>
                  </label>
                  <label className="ax-radio">
                    <input type="radio" name="presentation" checked={p.presentation === 'showcase'} onChange={() => set({ presentation: 'showcase' })} />
                    <span>
                      Zoom <em>in-situ / room photo</em>
                    </span>
                  </label>
                  <label className="ax-radio">
                    <input type="radio" name="presentation" checked={p.presentation === 'still'} onChange={() => set({ presentation: 'still' })} />
                    <span>
                      None <em>photo stays still</em>
                    </span>
                  </label>
                </div>
              </Field>
            )}
            <Switch checked={p.published} onChange={(v) => set({ published: v })} label={p.published ? 'Published — visible on the site' : 'Hidden — not on the site'} />
          </Card>

          {isDoor && (
            <PricingCard
              purchasable={p.purchasable}
              pricing={p.pricing}
              book={book}
              placeholder={placeholderHeadline(p.slug)}
              onChange={(patch) => set(patch)}
            />
          )}

          <Card title="Specs" sub="Short bullet points on the product page — grade, construction, sizes.">
            <div className="ax-specs">
              {p.specs.map((s, i) => (
                <div key={i} className="ax-row">
                  <input maxLength={200} value={s} aria-label={`Spec ${i + 1}`} onChange={(e) => set({ specs: p.specs.map((x, j) => (j === i ? e.target.value : x)) })} />
                  <button type="button" className="ax-ib" aria-label="Remove spec" onClick={() => set({ specs: p.specs.filter((_, j) => j !== i) })}>
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="ax-btn" onClick={() => set({ specs: [...p.specs, ''] })}>
                + Add spec
              </button>
            </div>
          </Card>
        </div>

        {/* live preview */}
        <aside className="ax-editor__preview">
          <div className="ax-preview-label">Card on the site — hover it</div>
          <div className="card ax-preview-card">
            <div className={`card__stage${isFullBleedVisual(preview.visual) ? ' card__stage--material' : ''}`}>
              <ProductVisual product={preview} />
            </div>
            <div className="card__body">
              <div className="card__cat">
                {worldName} · {subName || 'Section'}
              </div>
              <h3 className="card__name">{preview.name}</h3>
              <p className="card__tag">{preview.tag || <span className="ax-muted">One-line description</span>}</p>
            </div>
          </div>
          {isDoor && p.purchasable && p.pricing && <QuotePreview pricing={p.pricing} book={book} />}
        </aside>
      </div>

      <div className="ax-savebar">
        <span className={`ax-savebar__state${dirty ? ' is-dirty' : ''}`}>{dirty ? 'Unsaved changes' : isNew ? 'Not saved yet' : 'All changes saved'}</span>
        <div className="ax-row">
          <button type="button" className="ax-btn ax-btn--quiet" onClick={leave}>
            {dirty ? 'Discard' : 'Close'}
          </button>
          <button type="button" className="ax-btn ax-btn--primary" disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : isNew ? 'Add to catalogue' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
