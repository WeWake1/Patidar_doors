import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import { config, whatsappLink } from '../config'
import { sectionsIn } from '../data/products'
import { useCatalog } from '../data/useCatalog'
import type { World } from '../data/worlds'
import { t } from '../lib/i18n'
import { usePageMeta } from '../lib/usePageMeta'

/**
 * One themed "world" page per category — Timbers / Doors / Ply / WPC.
 * The look comes from [data-world] token scopes in styles/worlds.css.
 */
export function WorldPage({ world }: { world: World }) {
  usePageMeta(world.name, `${world.tagline}. ${world.description}`)
  const products = useCatalog().filter((p) => p.world === world.id)
  /* Section order comes from the CMS once the live catalogue has landed, so a
     section the client adds in /admin appears where they put it rather than
     tacked on the end. worlds.ts is the fallback — it is what the build-time
     snapshot knows — and anything a product claims that neither list mentions
     still gets its own heading, because the alternative is a product that
     renders nowhere. */
  const known = sectionsIn(world.id) ?? world.subcategories
  const extraSubs = [...new Set(products.map((p) => p.sub))].filter((s) => !known.includes(s))
  const sections = [...known, ...extraSubs]
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

      {/* The client can unpublish every product in a range from /admin, which
          left this page as an intro and a "why buy from us" with nothing
          between them — reading as a range that no longer exists rather than
          one that is between photographs. */}
      {sections.length === 0 && (
        <section className="world__section">
          <div className="empty-range">
            <h2 className="empty-range__title">{t('world.empty')}</h2>
            <p className="empty-range__body">{t('world.emptyBody')}</p>
            <a
              className="btn btn--dark"
              href={whatsappLink(`Hi ${config.brand}! What do you have in stock in the ${world.name} range?`)}
              target="_blank"
              rel="noreferrer"
            >
              Ask on WhatsApp
            </a>
          </div>
        </section>
      )}

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
