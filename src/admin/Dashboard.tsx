import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WORLDS } from '../data/worlds'
import type { DbProduct, DbSubcategory } from './api'
import { deleteProduct, deleteSubcategory, listProducts, listSubcategories, renameSubcategory } from './api'

export function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [subs, setSubs] = useState<DbSubcategory[]>([])
  const [err, setErr] = useState<string | null>(null)

  async function reload() {
    try {
      const [ps, ss] = await Promise.all([listProducts(), listSubcategories()])
      setProducts(ps)
      setSubs(ss)
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    }
  }
  useEffect(() => {
    reload()
  }, [])

  async function onDelete(p: DbProduct) {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return
    await deleteProduct(p.id!)
    reload()
  }
  async function onRenameSub(s: DbSubcategory) {
    const name = window.prompt('Rename section:', s.name)
    if (!name?.trim() || name === s.name) return
    await renameSubcategory(s.id, name.trim())
    reload()
  }
  async function onDeleteSub(s: DbSubcategory) {
    const count = products.filter((p) => p.subcategory_id === s.id).length
    if (count > 0) return window.alert(`Move or delete the ${count} product(s) in "${s.name}" first.`)
    if (!window.confirm(`Delete empty section "${s.name}"?`)) return
    await deleteSubcategory(s.id)
    reload()
  }

  return (
    <div className="ax-dash">
      <header className="ax-dash__head">
        <div>
          <h1>Catalogue</h1>
          <p>{products.length} products · changes go live on the site within ~a minute of the next publish.</p>
        </div>
        <div className="ax-row">
          <Link to="/admin/product/new" className="ax-btn ax-btn--primary">+ New product</Link>
          <button type="button" className="ax-btn" onClick={onSignOut}>Sign out</button>
        </div>
      </header>
      {err && <div className="ax-error">{err}</div>}

      {WORLDS.map((w) => {
        const worldSubs = subs.filter((s) => s.world === w.id)
        const worldProducts = products.filter((p) => p.world === w.id)
        return (
          <section key={w.id} className="ax-world">
            <h2>{w.name} <span>({worldProducts.length})</span></h2>
            {worldSubs.map((s) => {
              const items = worldProducts.filter((p) => p.subcategory_id === s.id)
              return (
                <div key={s.id} className="ax-sub">
                  <div className="ax-sub__head">
                    <h3>{s.name}</h3>
                    <div className="ax-row">
                      <button type="button" className="ax-link" onClick={() => onRenameSub(s)}>Rename</button>
                      <button type="button" className="ax-link" onClick={() => onDeleteSub(s)}>Delete</button>
                    </div>
                  </div>
                  <div className="ax-list">
                    {items.map((p) => (
                      <div key={p.id} className="ax-item">
                        {(() => {
                          const cover = p.images?.find((i) => i.role === 'cover')?.src_480
                          return cover ? (
                            <img className="ax-item__thumb" src={cover} alt="" />
                          ) : (
                            <span className="ax-item__thumb ax-item__thumb--none" aria-hidden="true" />
                          )
                        })()}
                        <div className="ax-item__main">
                          <div className="ax-item__name">{p.name}{!p.published && <em> · hidden</em>}</div>
                          <div className="ax-item__tag">{p.tag}</div>
                        </div>
                        <Link to={`/admin/product/${p.id}`} className="ax-btn">Edit</Link>
                        <button type="button" className="ax-btn" onClick={() => onDelete(p)}>Delete</button>
                      </div>
                    ))}
                    {items.length === 0 && <div className="ax-empty">No products yet.</div>}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
