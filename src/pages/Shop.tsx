import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { CATEGORIES, PRODUCTS } from '../data/products'
import { usePageMeta } from '../lib/usePageMeta'

export function Shop() {
  usePageMeta('All doors', 'Twelve original made-to-measure door designs — laminated, WPC, signature series and safety doors. Factory direct, installed.')
  const [params, setParams] = useSearchParams()
  const cat = params.get('cat') ?? 'All'
  const products = PRODUCTS.filter((p) => cat === 'All' || p.cat === cat)

  return (
    <div className="shop page-pad">
      <div className="kicker">The collection</div>
      <h1 className="shop__title">All doors</h1>
      <p className="shop__sub">
        Every door is made to order in your exact size and finish. Prices shown are for a standard 8′ × 3′ leaf,
        installation included.
      </p>

      <div className="chips" role="group" aria-label="Filter by category">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${cat === c ? ' chip--on' : ''}`}
            onClick={() => setParams(c === 'All' ? {} : { cat: c }, { replace: true })}
          >
            {c}
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
