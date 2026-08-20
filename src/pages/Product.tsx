import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { DoorConfigurator, PriceBreakdown } from '../components/DoorConfigurator'
import { DoorScene } from '../components/DoorScene'
import { MaterialArt } from '../components/MaterialArt'
import { PhotoShowcase } from '../components/PhotoShowcase'
import { ProductCard } from '../components/ProductCard'
import { ProductPhoto } from '../components/ProductPhoto'
import { useToast } from '../components/Toast'
import { config, whatsappLink } from '../config'
import { DEFAULT_CONFIG, formatSizeLabel, toSizeId, type DoorConfig } from '../data/pricing'
import type { Product as ProductT } from '../data/products'
import { PRODUCTS, defaultToneId, getProduct, getTone, quoteFor, tonesFor, tryState } from '../data/products'
import { getWorld } from '../data/worlds'
import { fmtINR } from '../lib/format'
import { t } from '../lib/i18n'
import { usePageMeta } from '../lib/usePageMeta'
import { NotFound } from './NotFound'

export function Product() {
  const { id } = useParams()
  const product = getProduct(id ?? '')
  if (!product) return <NotFound />
  // key resets configurator state when navigating between products
  return <ProductInner key={product.id} product={product} />
}

/**
 * The stage's affordance line. Touch devices have no hover — there the leaf
 * swings by itself as the card crosses mid-viewport (useAjarInView) — so both
 * phrasings ship and CSS picks the true one per pointer type.
 */
function StageNote() {
  return (
    <div className="pdp__stage-note">
      <span className="pdp__stage-note--hover">Hover the door — it opens.</span>
      <span className="pdp__stage-note--touch">Scroll — the door opens itself.</span>
    </div>
  )
}

/**
 * Doors only — every door, nothing but doors. `tryState` owns that rule (see
 * products.ts); this just renders it, so the day the photographed doors get
 * their leaf corners marked in /admin they light up here with no edit.
 */
function TryLink({ product, cfg, toneId }: { product: ProductT; cfg?: DoorConfig; toneId?: string }) {
  if (tryState(product) !== 'ready') return null
  const c = cfg ?? DEFAULT_CONFIG
  return (
    // The size and finish travel in the URL, so /try/kyoto?h=84&w=33 is also a
    // link the store can paste into a WhatsApp reply.
    <Link
      className="btn btn--ghost pdp__try"
      to={`/try/${product.id}?h=${c.heightIn}&w=${c.widthIn}${toneId ? `&t=${toneId}` : ''}`}
    >
      {t('try.open')}
    </Link>
  )
}

/**
 * `cfg` is threaded in so the try-on link carries the size the customer has
 * actually dialled in. It used to default here, which was right while no
 * photographed door had a configurator; now that they all do, a link built
 * from DEFAULT_CONFIG would quietly send an 8′ × 3′ door to /try however the
 * sliders were set — and that number is burnt into the picture that reaches
 * our WhatsApp.
 */
function ProductStage({ product, cfg }: { product: ProductT; cfg: DoorConfig }) {
  const visual = product.visual
  if (visual.kind === 'material') {
    return (
      <div className="pdp__stage pdp__stage--material">
        {/* same seed as the card that opened this page, so it is the same board */}
        <MaterialArt
          material={visual.material}
          base={visual.base}
          dark={visual.dark}
          light={visual.light}
          seed={product.id}
          className="pdp__material"
        />
      </div>
    )
  }
  if (visual.kind === 'photo') {
    const swing = (visual.presentation ?? 'swing') === 'swing'
    return (
      <div className="pdp__stage">
        {swing ? (
          <>
            <DoorScene photo={visual.cover} hoverOpen className="pdp__scene" />
            <StageNote />
          </>
        ) : (
          <PhotoShowcase photo={visual.cover} className="pdp__scene" />
        )}
        {visual.gallery && visual.gallery.length > 0 && (
          <div className="pdp__gallery">
            {visual.gallery.map((g) => (
              <ProductPhoto key={g.src} photo={g} sizes="30vw" />
            ))}
          </div>
        )}
        <TryLink product={product} cfg={cfg} />
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
  const [cfg, setCfg] = useState(DEFAULT_CONFIG)
  const [toneId, setToneId] = useState(defaultToneId(product))
  const cart = useCart()
  const { toast } = useToast()
  usePageMeta(product.name, product.tag)

  const world = getWorld(product.world)
  // Made-to-measure configurator for anything with a confirmed price — SVG art
  // doors pick a finish too; CMS photo doors configure size and options only.
  const configurable = product.purchasable && product.price !== undefined
  const tone = getTone(product, toneId)
  const quote = quoteFor(product, cfg, tone.id)
  const price = quote?.total ?? 0
  const related = PRODUCTS.filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.world === product.world) - Number(a.world === product.world))
    .slice(0, 3)

  const add = () => {
    cart.add(product.id, toSizeId(cfg.heightIn, cfg.widthIn), tone.id, cfg)
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
            <StageNote />
            <TryLink product={product} cfg={cfg} toneId={tone.id} />
          </div>
        ) : (
          <ProductStage product={product} cfg={cfg} />
        )}

        {configurable ? (
          <div className="pdp__info">
            <div className="pdp__cat">
              {world?.name} · {product.sub} · Made to measure
            </div>
            <h1 className="pdp__name">{product.name}</h1>
            {/* Factory doors carry no long story, only the one-line tag —
                without the fallback the heading sat on a blank paragraph. */}
            <p className="pdp__story">{product.story ?? product.tag}</p>

            <div className="pdp__price-row">
              <div className="pdp__price">{fmtINR(price)}</div>
              <div className="pdp__price-note">
                incl. GST & installation · {formatSizeLabel(cfg.heightIn, cfg.widthIn)}
              </div>
            </div>

            {quote && <DoorConfigurator config={cfg} onChange={setCfg} quote={quote} />}

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

            {quote && <PriceBreakdown quote={quote} />}

            <button type="button" className="btn btn--dark btn--big btn--block" onClick={add}>
              Add to cart — {fmtINR(price)}
            </button>
            <div className="pdp__reassure">Pay after the measurement visit · Cancel anytime before production</div>

            <ul className="pdp__specs">
              {product.specs.map((s) => (
                <li key={s}>{s}</li>
              ))}
              <li>Measurement visit & installation included in {config.serviceCity}</li>
              <li>Covered against manufacturing defects</li>
            </ul>
          </div>
        ) : (
          <EnquiryPanel product={product} />
        )}
      </div>

      <div className="pdp__related">
        {/* This is the section's heading, so it is one — the kicker class is the
            look, not the level. Without it the card names were h3s hanging off
            the product's h1 with nothing in between. */}
        <h2 className="kicker">You may also like</h2>
        <div className="grid grid--3">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
