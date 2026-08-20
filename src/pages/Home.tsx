import { Link } from 'react-router-dom'
import { DoorWallSlot } from '../components/DoorWallSlot'
import { HeroPortal } from '../components/HeroPortal'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import { PAYMENT_STEPS, PROCESS } from '../data/content'
import { FEATURED_IDS, getProduct } from '../data/products'
import { usePageMeta } from '../lib/usePageMeta'

const MARQUEE = 'Timbers  ✦  Doors  ✦  Ply  ✦  WPC  ✦  Our yard, our factory, our store  ✦  Made to measure  ✦  '

export function Home() {
  usePageMeta(
    undefined,
    'Patidar Doors by Patidar Timbers — teak timbers, made-to-measure doors, plywood and WPC from our own yard and factory. Explore online, see it in person.',
  )
  const featured = FEATURED_IDS.map((id) => getProduct(id)!).filter(Boolean)

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
            {/* h2: these are top-level sections of the page, and there is no
                heading above them to be a level-3 under */}
            <h2 className="props__head">{v.h}</h2>
            <p className="props__body">{v.p}</p>
          </Reveal>
        ))}
      </section>

      {/* ── DOOR WALL ────────────────────────────────────────────
          Moved off /shop 2026-08-13. `.props` above it makes the claim — "see
          it, touch it, then decide" — and the wall is the evidence: real doors
          standing in the real store, before `.featured` narrows to three with
          prices. It also keeps the page's dark-band rhythm even — hero, wall,
          econ, terms — with `.featured` as the light breather between this band
          and the next. Lazy + mounted on approach: see DoorWallSlot.

          (It followed a `.worldstrip` of four world tiles until 2026-08-13.
          That strip was removed, not moved: it rendered the same `w.short` +
          `w.tagline` to the same four routes as the hero corridor's "Choose
          your world", which every visitor scrolls through to reach any of this
          page. The worlds are still in the nav and the footer.) */}
      <DoorWallSlot />

      {/* ── FEATURED ─────────────────────────────────────────── */}
      <section className="featured">
        <div className="featured__top">
          <div>
            <div className="kicker">From the floor</div>
            <h2 className="featured__title">A few doors we’re proud of.</h2>
            <p className="featured__sub">
              Solid Burma teak, natural-veneer designers, and membrane lines in every shade — each one built in our
              factory and standing in the store.
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

      {/* A `.faqteaser` — three <details> from FAQS with a "read the full FAQ"
          link — sat here until 2026-08-13. Removed, not moved: accordions of
          shipping questions are the oldest furniture on a storefront, and the
          page had just answered the two that matter (`.process` = how it works,
          `.terms` = what you pay and when) in its own voice. What was left in
          the teaser was fine print, which belongs on /policies and /faq — both
          in the footer, and now cross-linked to each other. */}

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
