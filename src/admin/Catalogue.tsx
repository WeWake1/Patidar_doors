import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import type { WorldId } from '../data/products'
import { headlinePrice } from '../data/pricing'
import { isDoorProduct, placeholderHeadline } from '../data/products'
import { WORLDS } from '../data/worlds'
import { fmtINR } from '../lib/format'
import { t } from '../lib/i18n'
import type { DbProduct, DbSubcategory } from './api'
import {
  createSubcategory,
  deleteProduct,
  deleteSubcategory,
  humanError,
  isLeafCrop,
  listProducts,
  listSubcategories,
  renameSubcategory,
  reorderSubcategory,
} from './api'
import { Notice, Tag } from './ui'

/**
 * The catalogue, one world at a time.
 *
 * Forty products in four worlds was one long scroll with nothing to say which
 * of them were hidden, unpriced or unphotographed; the owner had to open each
 * one. Now a world is a tab, a section is a card, and every row carries its
 * state as tags — Hidden, No photo, from ₹…, Doorway view — so the whole
 * catalogue is readable without opening anything. Search cuts across worlds.
 */

const WORLD_IDS = WORLDS.map((w) => w.id)

export function Catalogue() {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [subs, setSubs] = useState<DbSubcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  /** An action that failed, as opposed to the page failing to load. */
  const [actionErr, setActionErr] = useState<string | null>(null)
  /** Ids currently mid-request, so a second click can't fire the same delete. */
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const [q, setQ] = useState('')
  const [params, setParams] = useSearchParams()
  // set by ProductEditor on a successful save; the editor closes, so this is
  // the only place the owner is told it worked
  const saved = (useLocation().state as { saved?: string } | null)?.saved

  const worldParam = params.get('world')
  const world: WorldId = (WORLD_IDS as string[]).includes(worldParam ?? '') ? (worldParam as WorldId) : 'doors'
  const setWorld = (w: WorldId) => setParams({ world: w }, { replace: true })

  const reload = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const [ps, ss] = await Promise.all([listProducts(), listSubcategories()])
      setProducts(ps)
      setSubs(ss)
    } catch (e) {
      setErr(humanError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  /**
   * Every mutation goes through here. Each of these used to be a bare `await`
   * with no `catch`: a blocked or offline write rejected into nothing, the
   * reload put the row straight back, and the only signal was that the click
   * appeared not to have worked.
   */
  async function run(id: string, action: () => Promise<unknown>, describe: (detail: string) => string) {
    if (busy.has(id)) return
    setActionErr(null)
    setBusy((b) => new Set(b).add(id))
    try {
      await action()
      await reload()
    } catch (e) {
      setActionErr(describe(humanError(e)))
    } finally {
      setBusy((b) => {
        const next = new Set(b)
        next.delete(id)
        return next
      })
    }
  }

  function onDelete(p: DbProduct) {
    if (!p.id) return
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return
    run(p.id, () => deleteProduct(p.id!), (detail) => t('ax.deleteFailed', { name: p.name, detail }))
  }
  function onAddSub(w: WorldId, worldName: string) {
    const name = window.prompt(`New section in ${worldName}:`)
    if (!name?.trim()) return
    run(`new-sub:${w}`, () => createSubcategory(w, name.trim()), (detail) => `Could not add “${name.trim()}” — ${detail}`)
  }
  function onRenameSub(s: DbSubcategory) {
    const name = window.prompt('Rename section:', s.name)
    if (!name?.trim() || name === s.name) return
    run(s.id, () => renameSubcategory(s.id, name.trim()), (detail) => t('ax.renameFailed', { name: s.name, detail }))
  }
  function onDeleteSub(s: DbSubcategory) {
    const count = products.filter((p) => p.subcategory_id === s.id).length
    if (count > 0) return window.alert(`Move or delete the ${count} product(s) in "${s.name}" first.`)
    if (!window.confirm(`Delete empty section "${s.name}"?`)) return
    run(s.id, () => deleteSubcategory(s.id), (detail) => t('ax.deleteFailed', { name: s.name, detail }))
  }
  /**
   * Swap a section with its neighbour. Sections are ordered by `sort_order`,
   * which nothing in the admin could change until now — the order on the site
   * was whatever the seed happened to write. Two writes, one for each row.
   */
  function onMoveSub(list: DbSubcategory[], i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    const a = list[i]
    const b = list[j]
    // Equal sort_orders (the seed wrote 90 for every new section) would swap
    // into themselves; give the pair distinct, ordered values instead.
    const lo = Math.min(a.sort_order, b.sort_order)
    const hi = lo === Math.max(a.sort_order, b.sort_order) ? lo + 1 : Math.max(a.sort_order, b.sort_order)
    const [first, second] = dir === -1 ? [a, b] : [b, a]
    run(
      a.id,
      async () => {
        await reorderSubcategory(first.id, lo)
        await reorderSubcategory(second.id, hi)
      },
      (detail) => `Could not move “${a.name}” — ${detail}`,
    )
  }

  const subIds = new Set(subs.map((s) => s.id))
  const orphans = products.filter((p) => !p.subcategory_id || !subIds.has(p.subcategory_id))
  const subName = (p: DbProduct) => subs.find((s) => s.id === p.subcategory_id)?.name ?? ''

  const query = q.trim().toLowerCase()
  const hits = useMemo(
    () =>
      query
        ? products.filter((p) => `${p.name} ${p.tag} ${subName(p)}`.toLowerCase().includes(query))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, products, subs],
  )

  const row = (p: DbProduct) => {
    const cover = p.images?.find((i) => i.role === 'cover')
    const pending = p.id ? busy.has(p.id) : false
    const door = isDoorProduct(p.world, subName(p))
    return (
      <div key={p.id} className={`ax-item${pending ? ' ax-item--busy' : ''}`}>
        {cover ? (
          <img className="ax-item__thumb" src={cover.src_480} alt="" loading="lazy" width={38} height={52} />
        ) : (
          <span className="ax-item__thumb ax-item__thumb--none" aria-hidden="true" />
        )}
        <div className="ax-item__main">
          <div className="ax-item__name">
            <Link to={`/admin/product/${p.id}`}>{p.name}</Link>
            {query && <span className="ax-item__where">{WORLDS.find((w) => w.id === p.world)?.name} · {subName(p) || t('ax.orphans')}</span>}
          </div>
          <div className="ax-item__tag">{p.tag || <em>No one-line description</em>}</div>
          <div className="ax-item__tags">
            {!p.published && <Tag kind="warn">Hidden</Tag>}
            {!cover && <Tag kind="fault">No photo</Tag>}
            {door &&
              (p.purchasable && p.pricing ? (
                <Tag kind="ok">from {fmtINR(headlinePrice(p.pricing))}</Tag>
              ) : placeholderHeadline(p.slug) !== undefined ? (
                <Tag kind="warn">placeholder {fmtINR(placeholderHeadline(p.slug)!)}</Tag>
              ) : (
                <Tag>Enquiry</Tag>
              ))}
            {door && cover && isLeafCrop(cover) && <Tag kind="ok">Doorway view</Tag>}
          </div>
        </div>
        <div className="ax-item__actions">
          <Link to={`/admin/product/${p.id}`} className="ax-btn ax-btn--sm">
            Edit
          </Link>
          <button type="button" className="ax-btn ax-btn--sm ax-btn--quiet" disabled={pending} onClick={() => onDelete(p)}>
            {pending ? '…' : 'Delete'}
          </button>
        </div>
      </div>
    )
  }

  const current = WORLDS.find((w) => w.id === world)!
  const worldSubs = subs.filter((s) => s.world === world)
  const worldProducts = products.filter((p) => p.world === world)

  return (
    <div className="ax-page ax-page--catalogue">
      <header className="ax-page__head">
        <div>
          <h1 className="ax-title">Catalogue</h1>
          <p className="ax-page__sub">
            {loading ? t('ax.loading') : `${products.length} products · a saved change is on the site straight away.`}
          </p>
        </div>
        <div className="ax-page__actions">
          <label className="ax-search">
            <span className="ax-visually-hidden">Search products</span>
            <input type="search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <Link to={`/admin/product/new?world=${world}`} className="ax-btn ax-btn--primary">
            + New product
          </Link>
        </div>
      </header>

      {actionErr && (
        <Notice kind="fault" role="alert">
          {actionErr}
        </Notice>
      )}
      {!err && saved && <Notice kind="ok">Saved “{saved}”.</Notice>}

      {/* The list used to render as "0 products" and four empty worlds while
          the first request was still in flight, and identically if that request
          failed — which reads, to the person who owns this catalogue, exactly
          like their catalogue being gone. */}
      {err ? (
        <div className="ax-state ax-state--fault" role="alert">
          <p>{t('ax.loadFailed', { detail: err })}</p>
          <button type="button" className="ax-btn ax-btn--primary" onClick={reload}>
            {t('ax.retry')}
          </button>
        </div>
      ) : loading ? (
        <div className="ax-state" aria-live="polite">
          {t('ax.loading')}
        </div>
      ) : query ? (
        <section className="ax-sub">
          <div className="ax-sub__head">
            <h3>
              {hits.length} {hits.length === 1 ? 'match' : 'matches'} for “{q.trim()}”
            </h3>
            <button type="button" className="ax-link" onClick={() => setQ('')}>
              Clear
            </button>
          </div>
          <div className="ax-list">{hits.map(row)}</div>
          {hits.length === 0 && <div className="ax-empty">Nothing by that name, one-liner or section.</div>}
        </section>
      ) : (
        <>
          {orphans.length > 0 && (
            <section className="ax-sub ax-sub--orphans">
              <div className="ax-sub__head">
                <h3>
                  {t('ax.orphans')} <span className="ax-count">{orphans.length}</span>
                </h3>
                <p className="ax-sub__note">{t('ax.orphansNote')}</p>
              </div>
              <div className="ax-list">{orphans.map(row)}</div>
            </section>
          )}

          <div className="ax-tabs" role="tablist" aria-label="World">
            {WORLDS.map((w) => {
              const n = products.filter((p) => p.world === w.id).length
              return (
                <button
                  key={w.id}
                  type="button"
                  role="tab"
                  aria-selected={w.id === world}
                  className={`ax-tab${w.id === world ? ' is-on' : ''}`}
                  onClick={() => setWorld(w.id)}
                >
                  {w.name} <span className="ax-count">{n}</span>
                </button>
              )
            })}
          </div>

          <section className="ax-world" role="tabpanel">
            <div className="ax-world__head">
              <p className="ax-world__tagline">{current.tagline}</p>
              <button
                type="button"
                className="ax-btn"
                disabled={busy.has(`new-sub:${world}`)}
                onClick={() => onAddSub(world, current.name)}
              >
                + New section
              </button>
            </div>
            {worldSubs.length === 0 && (
              <div className="ax-state">No sections yet — add the first one with “+ New section”.</div>
            )}
            {worldSubs.map((s, i) => {
              const items = worldProducts.filter((p) => p.subcategory_id === s.id)
              const pending = busy.has(s.id)
              const door = isDoorProduct(world, s.name)
              return (
                <div key={s.id} className={`ax-sub${pending ? ' ax-item--busy' : ''}`}>
                  <div className="ax-sub__head">
                    <h3>
                      {s.name} <span className="ax-count">{items.length}</span>
                      {world === 'wpc' && (
                        <span className="ax-sub__kind">{door ? 'doors' : 'boards'}</span>
                      )}
                    </h3>
                    <div className="ax-sub__actions">
                      <button type="button" className="ax-ib" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => onMoveSub(worldSubs, i, -1)}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className="ax-ib"
                        aria-label={`Move ${s.name} down`}
                        disabled={i === worldSubs.length - 1}
                        onClick={() => onMoveSub(worldSubs, i, 1)}
                      >
                        ↓
                      </button>
                      <button type="button" className="ax-link" onClick={() => onRenameSub(s)}>
                        Rename
                      </button>
                      <button type="button" className="ax-link ax-link--quiet" onClick={() => onDeleteSub(s)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="ax-list">
                    {items.map(row)}
                    {items.length === 0 && (
                      <div className="ax-empty">
                        No products yet — this section isn't shown on the site until it has one.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        </>
      )}
    </div>
  )
}
