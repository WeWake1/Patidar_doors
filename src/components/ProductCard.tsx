import { Link } from 'react-router-dom'
import type { Product } from '../data/products'
import { getTone } from '../data/products'
import { fmtINR } from '../lib/format'
import { DoorScene } from './DoorScene'

export function ProductCard({ product }: { product: Product }) {
  const tone = getTone(product, product.defaultTone)
  return (
    <Link to={`/door/${product.id}`} className="card">
      <div className="card__stage">
        <DoorScene art={product.art} tone={tone} hoverOpen />
      </div>
      <div className="card__body">
        <div className="card__cat">{product.cat}</div>
        <h3 className="card__name">{product.name}</h3>
        <p className="card__tag">{product.tag}</p>
        <div className="card__row">
          <div className="card__price">
            <span className="card__from">from</span> {fmtINR(product.price)}
          </div>
          <span className="btn btn--ghost card__cta">Configure</span>
        </div>
      </div>
    </Link>
  )
}
