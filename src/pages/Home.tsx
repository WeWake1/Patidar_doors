import { Link } from 'react-router-dom'
import { HeroPortal } from '../components/HeroPortal'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import { FAQS, PAYMENT_STEPS, PROCESS } from '../data/content'
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
              {/* data-world hands the tile that world's whole token block, so the
                  strip can never drift from the page it opens */}
              <Link to={`/${w.id}`} data-world={w.id} className={`worldstrip__tile worldstrip__tile--${w.id}`}>
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
          {/* each link carries its own trailing arrow so a narrow screen never
              starts a line with a dangling "→" */}
          <div className="econ__chain">
            {[
              { label: 'Sawmill', cut: false },
              { label: 'Distributor', cut: true },
              { label: 'Wholesaler', cut: true },
              { label: 'Retailer', cut: true },
              { label: 'Your home', cut: false },
            ].map((step, i, all) => (
              <span key={step.label} className="econ__link">
                <span className={step.cut ? 'econ__cut' : undefined}>{step.label}</span>
                {i < all.length - 1 && (
                  <span className="econ__arrow" aria-hidden="true">
                    →
                  </span>
                )}
              </span>
            ))}
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
      </section>

      {/* ── PAYMENT SEQUENCE ─────────────────────────────────────
          Replaced three fabricated testimonials (see content.ts). The band
          keeps its place in the page's dark-band rhythm and absorbs the old
          `.process__note`, which said the same thing in 13.5px muted text —
          the terms are the reassurance, so they get the band, not a footnote. */}
      <section className="terms">
        <div className="terms__inner">
          <div className="kicker kicker--gold">What you pay, and when</div>
          <h2 className="terms__title">Nothing is paid online.</h2>
          <ol className="terms__track">
            {PAYMENT_STEPS.map((s, i) => (
              <Reveal key={s.when} as="li" delay={i * 90} className="terms__stop">
                <span className="diamond diamond--gold" aria-hidden="true" />
                <span className="terms__amount">{s.amount}</span>
                <span className="terms__when">{s.when}</span>
                <p className="terms__body">{s.body}</p>
              </Reveal>
            ))}
          </ol>
          <p className="terms__foot">
            Cancel free of charge any time before production begins.
          </p>
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
