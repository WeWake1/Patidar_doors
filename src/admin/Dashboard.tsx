import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { WORLDS } from '../data/worlds'
import { t } from '../lib/i18n'
import type { DbProduct, DbSubcategory } from './api'
import {
  deleteProduct,
  deleteSubcategory,
  humanError,
  listProducts,
  listSubcategories,
  renameSubcategory,
} from './api'

export function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [subs, setSubs] = useState<DbSubcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  /** An action that failed, as opposed to the page failing to load. */
  const [actionErr, setActionErr] = useState<string | null>(null)
  /** Ids currently mid-request, so a second click can't fire the same delete. */
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  // set by ProductEditor on a successful save; the editor closes, so this is
  // the only place the owner is told it worked
  const saved = (useLocation().state as { saved?: string } | null)?.saved

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
   * A product whose section was deleted, or whose section belongs to another
   * world, matched no `worldSubs` group and so rendered nowhere — it was still
   * in the database, still counted in the world's header, and completely
   * unreachable. It gets its own group instead of disappearing.
   */
  const subIds = new Set(subs.map((s) => s.id))
  const orphans = products.filter((p) => !p.subcategory_id || !subIds.has(p.subcategory_id))

  const item = (p: DbProduct) => {
    const cover = p.images?.find((i) => i.role === 'cover')?.src_480
    const pending = p.id ? busy.has(p.id) : false
    return (
      <div key={p.id} className={`ax-item${pending ? ' ax-item--busy' : ''}`}>
        {cover ? (
          <img className="ax-item__thumb" src={cover} alt="" loading="lazy" />
        ) : (
          <span className="ax-item__thumb ax-item__thumb--none" aria-hidden="true" />
        )}
        <div className="ax-item__main">
          <div className="ax-item__name">
            {p.name}
            {!p.published && <span className="ax-badge">Hidden</span>}
          </div>
          <div className="ax-item__tag">{p.tag}</div>
        </div>
        <Link to={`/admin/product/${p.id}`} className="ax-btn">
          Edit
        </Link>
        <button type="button" className="ax-btn" disabled={pending} onClick={() => onDelete(p)}>
          {pending ? '…' : 'Delete'}
        </button>
      </div>
    )
  }

  return (
    <div className="ax-dash">
      <header className="ax-dash__head">
        <div>
          <h1>Catalogue</h1>
          <p>
            {loading
              ? t('ax.loading')
              : `${products.length} products · changes go live on the site within ~a minute of the next publish.`}
          </p>
        </div>
        <div className="ax-row">
          <Link to="/admin/product/new" className="ax-btn ax-btn--primary">
            + New product
          </Link>
          <button type="button" className="ax-btn" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      {actionErr && (
        <div className="ax-note ax-note--fault" role="alert">
          {actionErr}
        </div>
      )}
      {!err && saved && <div className="ax-note ax-note--ok">Saved &ldquo;{saved}&rdquo;.</div>}

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
      ) : (
        <>
          {orphans.length > 0 && (
            <section className="ax-world">
              <h2>
                {t('ax.orphans')} <span>({orphans.length})</span>
              </h2>
              <div className="ax-sub">
                <div className="ax-sub__head">
                  <p className="ax-sub__note">{t('ax.orphansNote')}</p>
                </div>
                <div className="ax-list">{orphans.map(item)}</div>
              </div>
            </section>
          )}

          {WORLDS.map((w) => {
            const worldSubs = subs.filter((s) => s.world === w.id)
            const worldProducts = products.filter((p) => p.world === w.id)
            return (
              <section key={w.id} className="ax-world">
                <h2>
                  {w.name} <span>({worldProducts.length})</span>
                </h2>
                {worldSubs.length === 0 && (
                  <div className="ax-empty">No sections yet — add one from any product's editor.</div>
                )}
                {worldSubs.map((s) => {
                  const items = worldProducts.filter((p) => p.subcategory_id === s.id)
                  const pending = busy.has(s.id)
                  return (
                    <div key={s.id} className="ax-sub">
                      <div className="ax-sub__head">
                        <h3>{s.name}</h3>
                        <div className="ax-row">
                          <button type="button" className="ax-link" disabled={pending} onClick={() => onRenameSub(s)}>
                            Rename
                          </button>
                          <button type="button" className="ax-link" disabled={pending} onClick={() => onDeleteSub(s)}>
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="ax-list">
                        {items.map(item)}
                        {items.length === 0 && <div className="ax-empty">No products yet.</div>}
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
