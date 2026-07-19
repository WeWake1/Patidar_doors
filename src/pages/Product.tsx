import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { DoorScene } from '../components/DoorScene'
import { MaterialArt } from '../components/MaterialArt'
import { ProductCard } from '../components/ProductCard'
import { useToast } from '../components/Toast'
import { config, whatsappLink } from '../config'
import type { Product as ProductT } from '../data/products'
import { BASE_SIZE_ID, PRODUCTS, SIZES, defaultToneId, getProduct, getTone, priceFor, tonesFor } from '../data/products'
import { getWorld } from '../data/worlds'
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

function ProductStage({ product }: { product: ProductT }) {
  const visual = product.visual
  if (visual.kind === 'material') {
    return (
      <div className="pdp__stage pdp__stage--material">
        <MaterialArt material={visual.material} base={visual.base} dark={visual.dark} light={visual.light} className="pdp__material" />
      </div>
    )
  }
  if (visual.kind === 'photo') {
    return (
      <div className="pdp__stage">
        <DoorScene photo={visual.cover} hoverOpen className="pdp__scene" />
        <div className="pdp__stage-note">Hover the door — it opens.</div>
        {visual.gallery && visual.gallery.length > 0 && (
          <div className="pdp__gallery">
            {visual.gallery.map((g) => (
              <img key={g.src} src={g.src} srcSet={g.srcSet} sizes="30vw" alt={g.alt} loading="lazy" decoding="async" />
            ))}
          </div>
        )}
      </div>
    )
  }
  return null
}

function EnquiryPanel({ product }: { product: ProductT }) {
  const world = getWorld(product.world)
  const waUrl = whatsappLink(
    `Hi ${config.brand}! I'd like to know more about ${product.name} (${world?.name ?? ''} range) — price and availability, please.`,
  )
  return (
    <div className="pdp__info">
      <div className="pdp__cat">
        {world?.name} · {product.sub}
      </div>
      <h1 className="pdp__name">{product.name}</h1>
      <p className="pdp__story">{product.story ?? product.tag}</p>

      <ul className="pdp__specs pdp__specs--enquire">
        {product.specs.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>

      <div className="pdp__enquire">
        <div className="pdp__enquire-note">
          Pricing depends on grade, size and current stock — message us or walk into the store and see it in person.
        </div>
        <a className="btn btn--dark btn--big btn--block" href={waUrl} target="_blank" rel="noreferrer">
          Enquire on WhatsApp
        </a>
        <Link to="/visit" className="btn btn--ghost btn--block">
          Visit the store
        </Link>
      </div>
    </div>
  )
}

function ProductInner({ product }: { product: ProductT }) {
  const [sizeId, setSizeId] = useState(BASE_SIZE_ID)
  const [toneId, setToneId] = useState(defaultToneId(product))
  const cart = useCart()
  const { toast } = useToast()
  usePageMeta(product.name, product.tag)

  const world = getWorld(product.world)
  // Size×finish configurator for anything with a confirmed price — SVG art
  // doors pick a finish too; CMS photo doors configure size only.
  const configurable = product.purchasable && product.price !== undefined
  const tone = getTone(product, toneId)
  const price = priceFor(product, sizeId, tone.id)
  const related = PRODUCTS.filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.world === product.world) - Number(a.world === product.world))
    .slice(0, 3)

  const add = () => {
    cart.add(product.id, sizeId, tone.id)
    toast(`${product.name} added to cart`)
  }

  return (
    <div className="pdp page-pad">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to={`/${product.world}`}>{world?.name ?? 'Catalogue'}</Link>
        <span aria-hidden="true"> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="pdp__grid">
        {product.visual.kind === 'art' ? (
          <div className="pdp__stage">
            <DoorScene art={product.visual.art} tone={tone} hoverOpen className="pdp__scene" />
            <div className="pdp__stage-note">Hover the door — it opens.</div>
          </div>
        ) : (
          <ProductStage product={product} />
        )}

        {configurable ? (
          <div className="pdp__info">
            <div className="pdp__cat">
              {world?.name} · {product.sub} · Made to measure
            </div>
            <h1 className="pdp__name">{product.name}</h1>
            <p className="pdp__story">{product.story}</p>
            {product.motif && (
              <div className="pdp__motif">
                <span className="diamond" aria-hidden="true" />
                Recreated from a trending motif: {product.motif}
              </div>
            )}

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
                Different opening? Pick the closest size — we confirm exact dimensions (and price, same per-area rate)
                at the free measurement visit.
              </div>
            </fieldset>

            {tonesFor(product).length > 0 && (
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
            )}

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
        ) : (
          <EnquiryPanel product={product} />
        )}
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
