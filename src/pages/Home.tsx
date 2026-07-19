import { Link } from 'react-router-dom'
import { HeroPortal } from '../components/HeroPortal'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import { FAQS, PROCESS, TESTIMONIALS } from '../data/content'
import { getProduct } from '../data/products'
import { WORLDS } from '../data/worlds'
import { usePageMeta } from '../lib/usePageMeta'

const MARQUEE = 'Timbers  ✦  Doors  ✦  Ply  ✦  WPC  ✦  Our yard, our factory, our store  ✦  Made to measure  ✦  '

const FEATURED = ['burma-teak-door', 'meridian', 'membrane-door']

export function Home() {
  usePageMeta(
    undefined,
    'Patidar Doors by Patidar Timbers — teak timbers, made-to-measure doors, plywood and WPC from our own yard and factory. Explore online, see it in person.',
  )
  const featured = FEATURED.map((id) => getProduct(id)!).filter(Boolean)

  return (
    <div>
      {/* ── PORTAL HERO ──────────────────────────────────────── */}
      <HeroPortal />

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          <span>{MARQUEE}</span>
          <span>{MARQUEE}</span>
        </div>
      </div>

      {/* ── VALUE PROPS ──────────────────────────────────────── */}
      <section className="props">
        {[
          {
            n: '01',
            h: 'Three generations of timber',
            p: 'We buy logs whole, saw them in our own yard and season them ourselves. When we grade a teak door, it is our name on the grain.',
          },
          {
            n: '02',
            h: 'See it, touch it, then decide',
            p: 'Everything on this site stands on our shop floor. Shortlist online, then walk in — swing the doors, stack the ply, smell the wood.',
          },
          {
            n: '03',
            h: 'Factory & showroom, one address',
            p: 'The people who sell your door are the people who made it. Custom sizes, custom polish, honest advice — no middle layer anywhere.',
          },
        ].map((v, i) => (
          <Reveal key={v.n} delay={i * 90}>
            <div className="props__num">{v.n}</div>
            <h3 className="props__head">{v.h}</h3>
            <p className="props__body">{v.p}</p>
          </Reveal>
        ))}
      </section>

      {/* ── WORLD TILES ──────────────────────────────────────── */}
      <section className="worldstrip">
        <div className="featured__top">
          <div>
            <div className="kicker">Four worlds, one roof</div>
            <h2 className="featured__title">Where do you want to start?</h2>
          </div>
        </div>
        <div className="worldstrip__grid">
          {WORLDS.map((w, i) => (
            <Reveal key={w.id} delay={i * 80}>
              <Link to={`/${w.id}`} className={`worldstrip__tile worldstrip__tile--${w.id}`}>
                <span className="worldstrip__name">{w.short}</span>
                <span className="worldstrip__tag">{w.tagline}</span>
                <span className="worldstrip__go" aria-hidden="true">
                  Enter →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FEATURED ─────────────────────────────────────────── */}
      <section className="featured">
        <div className="featured__top">
          <div>
            <div className="kicker">From the floor</div>
            <h2 className="featured__title">A few doors we’re proud of.</h2>
            <p className="featured__sub">
              Solid Burma teak, our Designer Studio originals, and membrane lines in every shade — each one built in
              our factory and standing in the store.
            </p>
          </div>
          <Link to="/shop" className="linkline">
            View the catalogue →
          </Link>
        </div>
        <div className="grid grid--3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── ECONOMICS ────────────────────────────────────────── */}
      <section className="econ">
        <div className="econ__inner">
          <div className="kicker kicker--gold">The economics of wood</div>
          <div className="econ__label">The usual way</div>
          <div className="econ__chain">
            <span>Sawmill</span>
            <span className="econ__arrow">→</span>
            <span className="econ__cut">Distributor</span>
            <span className="econ__arrow">→</span>
            <span className="econ__cut">Wholesaler</span>
            <span className="econ__arrow">→</span>
            <span className="econ__cut">Retailer</span>
            <span className="econ__arrow">→</span>
            <span>Your home</span>
          </div>
          <div className="econ__label econ__label--after">The Patidar way</div>
          <div className="econ__punch">Our yard → Your home.</div>
          <p className="econ__body">
            Every layer between the sawmill and you adds margin, delay and handling damage. We are the sawmill, the
            factory and the store — so the wood moves once, and the savings stay with you.
          </p>
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────────────── */}
      <section className="process">
        <div className="kicker">How it works</div>
        <h2 className="process__title">Shortlist to installed, in four steps.</h2>
        <div className="process__grid">
          {PROCESS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90} className="process__step">
              <div className="process__num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </Reveal>
          ))}
        </div>
        <div className="process__note">
          You pay nothing online. 50% after the measurement visit, the rest after installation.
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="quotes">
        <div className="kicker kicker--gold">From our doorways</div>
        <div className="quotes__grid">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 90} className="quotes__card">
              <p className="quotes__text">“{t.quote}”</p>
              <div className="quotes__who">
                {t.name} · {t.place}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FAQ TEASER ───────────────────────────────────────── */}
      <section className="faqteaser">
        <div className="faqteaser__col">
          <div className="kicker">Good to know</div>
          <h2 className="faqteaser__title">Questions, answered.</h2>
          <Link to="/faq" className="linkline">
            Read the full FAQ →
          </Link>
        </div>
        <div className="faqteaser__list">
          {FAQS.slice(0, 3).map((f) => (
            <details key={f.q} className="faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="cta">
        <h2 className="cta__title">
          The store is <em>open</em>.
        </h2>
        <p className="cta__sub">Shortlist online in minutes — then come stand in front of the real thing.</p>
        <div className="cta__row">
          <Link to="/shop" className="btn btn--dark btn--big">
            Browse the catalogue
          </Link>
          <Link to="/visit" className="btn btn--big">
            Visit the store
          </Link>
        </div>
      </section>
    </div>
  )
}
