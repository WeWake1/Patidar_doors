import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import { config, whatsappLink } from '../config'
import { productsIn } from '../data/products'
import type { World } from '../data/worlds'
import { usePageMeta } from '../lib/usePageMeta'

/**
 * One themed "world" page per category — Timbers / Doors / Ply / WPC.
 * The look comes from [data-world] token scopes in styles/worlds.css.
 */
export function WorldPage({ world }: { world: World }) {
  usePageMeta(world.name, `${world.tagline}. ${world.description}`)
  const products = productsIn(world.id)
  const sections = world.subcategories
    .map((sub) => ({ sub, items: products.filter((p) => p.sub === sub) }))
    .filter((s) => s.items.length > 0)

  return (
    <div className="world" data-world={world.id}>
      <header className="world__intro">
        <div className="world__intro-inner">
          <div className="world__kicker">
            {config.brand} · {world.short}
          </div>
          <h1 className="world__title">{world.tagline}</h1>
          <p className="world__desc">{world.description}</p>
        </div>
        <div className="world__motif" aria-hidden="true" />
      </header>

      {sections.map((s) => (
        <section key={s.sub} className="world__section">
          <Reveal>
            <h2 className="world__section-title">{s.sub}</h2>
          </Reveal>
          <div className="grid grid--3">
            {s.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}

      <section className="world__why">
        <div className="world__why-inner">
          <h2>Why buy it from Patidar?</h2>
          <p>
            We are not a marketplace — the yard, the factory and the store are ours. What you shortlist here is
            physically on our floor: same grain, same grade, same sheet. Come see it before you spend a rupee.
          </p>
          <div className="world__why-actions">
            <Link to="/visit" className="btn btn--dark">
              Visit the store
            </Link>
            <a
              className="btn btn--ghost"
              href={whatsappLink(`Hi ${config.brand}! I have a question about your ${world.name} range.`)}
              target="_blank"
              rel="noreferrer"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
