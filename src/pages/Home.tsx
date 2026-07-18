import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DoorScene } from '../components/DoorScene'
import { ProductCard } from '../components/ProductCard'
import { Reveal } from '../components/Reveal'
import { FAQS, PROCESS, TESTIMONIALS } from '../data/content'
import { FEATURED_IDS, PRODUCTS, WOOD_TONES } from '../data/products'
import { usePageMeta } from '../lib/usePageMeta'

function useScrollProgress(): number {
  const [prog, setProg] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      if (raf.current) return
      raf.current = requestAnimationFrame(() => {
        raf.current = 0
        const h = Math.max(1, window.innerHeight * 0.85)
        setProg(Math.max(0, Math.min(1, window.scrollY / h)))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [])
  return prog
}

const MARQUEE = 'Made to measure  ✦  Factory direct  ✦  Delivered & installed  ✦  10-year warranty  ✦  Pan-India  ✦  '

export function Home() {
  usePageMeta(undefined, 'Premium doors made to measure in our own factory, sold direct to your home — delivered and installed across India.')
  const navigate = useNavigate()
  const prog = useScrollProgress()
  const [finish, setFinish] = useState(0)

  const ease = 1 - Math.pow(1 - prog, 3)
  const angle = ease * 86
  const tone = WOOD_TONES[finish]
  const featured = FEATURED_IDS.map((id) => PRODUCTS.find((p) => p.id === id)!)

  const peekDoor = () => {
    const target = window.scrollY < window.innerHeight * 0.4 ? window.innerHeight * 0.95 : 0
    window.scrollTo({ top: target, behavior: 'smooth' })
  }

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__sticky">
          <div className="hero__kicker rise">Our yard&nbsp;&nbsp;·&nbsp;&nbsp;Our factory&nbsp;&nbsp;·&nbsp;&nbsp;Our store</div>
          <h1 className="hero__title rise rise--1">
            Just <em>doors</em>.
          </h1>
          <p className="hero__sub rise rise--2">
            Premium doors made to measure in our own factory, sold direct to your home — delivered and installed across
            India.
          </p>

          <div className="hero__stage rise rise--3">
            <DoorScene art="classic" tone={tone} openDeg={angle} onLeafClick={peekDoor} className="hero__scene">
              <div
                className="hero__step"
                style={{
                  opacity: Math.min(1, ease * 1.7),
                  transform: `translateY(${(1 - ease) * 16}px)`,
                  pointerEvents: ease > 0.3 ? 'auto' : 'none',
                }}
              >
                <div className="hero__step-kicker">The showroom is open</div>
                <button type="button" className="btn btn--night" onClick={() => navigate('/shop')}>
                  Step inside →
                </button>
              </div>
            </DoorScene>
            <div className="hero__floor" aria-hidden="true" />

            <div className="hero__finishes">
              {WOOD_TONES.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  aria-label={`Preview finish: ${t.name}`}
                  className={`hero__chip${i === finish ? ' hero__chip--on' : ''}`}
                  style={{ background: `linear-gradient(160deg, ${t.light}, ${t.base} 55%, ${t.dark})` }}
                  onClick={() => setFinish(i)}
                />
              ))}
              <span className="hero__finish-name">{tone.name}</span>
            </div>
          </div>

          <button type="button" className="hero__scrollcue" onClick={peekDoor}>
            <span>Scroll — the door opens</span>
            <span className="hero__arrow" aria-hidden="true">
              ↓
            </span>
          </button>
        </div>
      </section>

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
            h: 'Direct from our factory',
            p: "No distributor, no retailer, no carpenter's cut. You buy a door at the maker's price — every rupee of margin we removed stays with you.",
          },
          {
            n: '02',
            h: 'Made to your measurements',
            p: 'We measure your frame, then cut, laminate and finish each door to the millimetre. No on-site sawing, no compromises.',
          },
          {
            n: '03',
            h: 'Delivered & installed',
            p: 'White-glove delivery with installation by our own fitters. Your door is hung, aligned and finished before we leave.',
          },
        ].map((v, i) => (
          <Reveal key={v.n} delay={i * 90}>
            <div className="props__num">{v.n}</div>
            <h3 className="props__head">{v.h}</h3>
            <p className="props__body">{v.p}</p>
          </Reveal>
        ))}
      </section>

      {/* ── FEATURED ─────────────────────────────────────────── */}
      <section className="featured">
        <div className="featured__top">
          <div>
            <div className="kicker">The collection</div>
            <h2 className="featured__title">Twelve doors. One standard.</h2>
            <p className="featured__sub">
              Original designs recreated from the most-saved door ideas on Pinterest — fluted, inlaid, latticed — and
              built in our factory.
            </p>
          </div>
          <Link to="/shop" className="linkline">
            View all doors →
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
          <div className="kicker kicker--gold">The economics of a door</div>
          <div className="econ__label">The old way</div>
          <div className="econ__chain">
            <span>Factory</span>
            <span className="econ__arrow">→</span>
            <span className="econ__cut">Distributor</span>
            <span className="econ__arrow">→</span>
            <span className="econ__cut">Wholesaler</span>
            <span className="econ__arrow">→</span>
            <span className="econ__cut">Retailer</span>
            <span className="econ__arrow">→</span>
            <span className="econ__cut">Carpenter</span>
            <span className="econ__arrow">→</span>
            <span>Your home</span>
          </div>
          <div className="econ__label econ__label--after">The Patidar way</div>
          <div className="econ__punch">Factory → Your home.</div>
          <p className="econ__body">
            Every layer between the maker and you adds margin, delay and handling damage. We removed all of them. You
            order online; we craft your door, deliver it and install it. The savings stay with you — the quality stays
            with us.
          </p>
        </div>
      </section>

      {/* ── PROCESS ──────────────────────────────────────────── */}
      <section className="process">
        <div className="kicker">How it works</div>
        <h2 className="process__title">Order to installed, in four steps.</h2>
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
          Your entrance <em>awaits</em>.
        </h2>
        <p className="cta__sub">Order in minutes. Measured, made and installed in weeks — not months.</p>
        <Link to="/shop" className="btn btn--dark btn--big">
          Browse all doors
        </Link>
      </section>
    </div>
  )
}
