import { Link } from 'react-router-dom'
import type { Product } from '../data/products'
import { getWorld } from '../data/worlds'
import { fmtINR } from '../lib/format'
import { ProductVisual } from './ProductVisual'

export function ProductCard({ product }: { product: Product }) {
  const world = getWorld(product.world)
  const visual = product.visual
  return (
    <Link to={`/product/${product.id}`} className="card">
      {visual.kind === 'material' ? (
        <div className="card__stage card__stage--material">
          <ProductVisual product={product} />
        </div>
      ) : (
        <div className="card__stage">
          <ProductVisual product={product} />
        </div>
      )}
      <div className="card__body">
        <div className="card__cat">
          {world?.name} · {product.sub}
        </div>
        <h3 className="card__name">{product.name}</h3>
        <p className="card__tag">{product.tag}</p>
        <div className="card__row">
          {product.purchasable && product.price !== undefined ? (
            <>
              <div className="card__price">
                <span className="card__from">from</span> {fmtINR(product.price)}
              </div>
              <span className="btn btn--ghost card__cta">Configure</span>
            </>
          ) : (
            <>
              <div className="card__price card__price--enquire">Price on enquiry</div>
              <span className="btn btn--ghost card__cta">View</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
