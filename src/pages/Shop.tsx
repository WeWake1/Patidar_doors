import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { PRODUCTS } from '../data/products'
import { WORLDS } from '../data/worlds'
import { usePageMeta } from '../lib/usePageMeta'

export function Shop() {
  usePageMeta(
    'Catalogue',
    'The full Patidar Doors catalogue — teak timbers, made-to-measure doors, plywood and WPC, all from our own yard and factory.',
  )
  const [params, setParams] = useSearchParams()
  const world = params.get('world') ?? 'all'
  const products = PRODUCTS.filter((p) => world === 'all' || p.world === world)

  return (
    <div className="shop page-pad">
      <div className="kicker">Everything under one roof</div>
      <h1 className="shop__title">Catalogue</h1>
      <p className="shop__sub">
        Timbers, doors, ply and WPC — everything on this page is stocked or made by us. Doors are made to order in
        your exact size; sheet and timber prices are confirmed in store or on WhatsApp.
      </p>

      <div className="chips" role="group" aria-label="Filter by range">
        <button
          type="button"
          className={`chip${world === 'all' ? ' chip--on' : ''}`}
          onClick={() => setParams({}, { replace: true })}
        >
          All
        </button>
        {WORLDS.map((w) => (
          <button
            key={w.id}
            type="button"
            className={`chip${world === w.id ? ' chip--on' : ''}`}
            onClick={() => setParams({ world: w.id }, { replace: true })}
          >
            {w.name}
          </button>
        ))}
      </div>

      <div className="grid grid--3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}
