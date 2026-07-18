import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { DoorScene } from '../components/DoorScene'
import { ProductCard } from '../components/ProductCard'
import { useToast } from '../components/Toast'
import type { Product as ProductT } from '../data/products'
import { BASE_SIZE_ID, PRODUCTS, SIZES, getProduct, getTone, priceFor, tonesFor } from '../data/products'
import { fmtINR } from '../lib/format'
import { usePageMeta } from '../lib/usePageMeta'
import { NotFound } from './NotFound'

export function Product() {
  const { id } = useParams()
  const product = getProduct(id ?? '')
  if (!product) return <NotFound />
  // key resets configurator state when navigating between products
  return <ProductInner key={product.id} product={product} />
}

function ProductInner({ product }: { product: ProductT }) {
  const [sizeId, setSizeId] = useState(BASE_SIZE_ID)
  const [toneId, setToneId] = useState(product.defaultTone)
  const cart = useCart()
  const { toast } = useToast()
  usePageMeta(product.name, product.tag)

  const tone = getTone(product, toneId)
  const price = priceFor(product, sizeId, tone.id)
  const related = PRODUCTS.filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.cat === product.cat) - Number(a.cat === product.cat))
    .slice(0, 3)

  const add = () => {
    cart.add(product.id, sizeId, tone.id)
    toast(`${product.name} added to cart`)
  }

  return (
    <div className="pdp page-pad">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/shop">All doors</Link>
        <span aria-hidden="true"> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="pdp__grid">
        <div className="pdp__stage">
          <DoorScene art={product.art} tone={tone} hoverOpen className="pdp__scene" />
          <div className="pdp__stage-note">Hover the door — it opens.</div>
        </div>

        <div className="pdp__info">
          <div className="pdp__cat">{product.cat} · Made to measure</div>
          <h1 className="pdp__name">{product.name}</h1>
          <p className="pdp__story">{product.story}</p>
          <div className="pdp__motif">
            <span className="diamond" aria-hidden="true" />
            Recreated from a trending motif: {product.motif}
          </div>

          <div className="pdp__price-row">
            <div className="pdp__price">{fmtINR(price)}</div>
            <div className="pdp__price-note">installed · {SIZES.find((s) => s.id === sizeId)?.label}</div>
          </div>

          <fieldset className="cfg">
            <legend>Size — made to your frame</legend>
            <div className="cfg__sizes">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`cfg__size${sizeId === s.id ? ' cfg__size--on' : ''}`}
                  onClick={() => setSizeId(s.id)}
                  aria-pressed={sizeId === s.id}
                >
                  <span className="cfg__size-label">{s.label}</span>
                  <span className="cfg__size-note">{s.note}</span>
                </button>
              ))}
            </div>
            <div className="cfg__hint">
              Different opening? Pick the closest size — we confirm exact dimensions (and price, same per-area rate) at
              the free measurement visit.
            </div>
          </fieldset>

          <fieldset className="cfg">
            <legend>Finish</legend>
            <div className="cfg__tones">
              {tonesFor(product).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  className={`cfg__tone${tone.id === t.id ? ' cfg__tone--on' : ''}`}
                  style={{ background: `linear-gradient(160deg, ${t.light}, ${t.base} 55%, ${t.dark})` }}
                  onClick={() => setToneId(t.id)}
                  aria-pressed={tone.id === t.id}
                  aria-label={`Finish: ${t.name}${t.delta ? `, adds ${fmtINR(t.delta)}` : ''}`}
                />
              ))}
            </div>
            <div className="cfg__tone-name">
              {tone.name}
              {tone.delta > 0 && <span className="cfg__tone-delta"> +{fmtINR(tone.delta)}</span>}
            </div>
          </fieldset>

          <button type="button" className="btn btn--dark btn--big btn--block" onClick={add}>
            Add to cart — {fmtINR(price)}
          </button>
          <div className="pdp__reassure">Pay after the measurement visit · Cancel anytime before production</div>

          <ul className="pdp__specs">
            {product.specs.map((s) => (
              <li key={s}>{s}</li>
            ))}
            <li>Free measurement visit & installation included</li>
            <li>10-year warranty</li>
          </ul>
        </div>
      </div>

      <div className="pdp__related">
        <div className="kicker">You may also like</div>
        <div className="grid grid--3">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
