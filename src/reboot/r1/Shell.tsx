// PROTOTYPE round 1: the header and the short page after each hero, shared so the four heroes can be judged in
// context. Each variant themes them through its own CSS (colour, type, spacing). Every line here is a confirmed
// fact: the product lines are the catalogue's, the sales flow is the client's (PRODUCT.md, 2026-08-14), the
// address and hours are src/config.ts.
import { config, whatsappLink } from '../../config'

export const WA = whatsappLink('Hello Patidar Doors, I saw your website and would like to visit the store.')

export const SECTIONS = [
  { href: '/timbers', name: 'Timbers', what: 'Burmese and Ghana teak, honne, sal, mahogany and neem, sawn in our own yard.' },
  { href: '/doors', name: 'Doors', what: 'Teak, hardwood, veneer, laminate, membrane and WPC doors, made to measure.' },
  { href: '/ply', name: 'Ply', what: 'Commercial ply, 710 marine grade, calibrated ply and blockboard.' },
  { href: '/wpc', name: 'WPC', what: 'Solid WPC sheets, and WPC doors that do not swell.' },
] as const

export function Header({ mark = 'dark' }: { mark?: 'dark' | 'light' }) {
  return (
    <header className="rb-head">
      <a className="rb-brand" href="#top" aria-label="Patidar Doors">
        <img
          src={mark === 'dark' ? '/images/logo/patidar-mark.png' : '/images/logo/patidar-mark-cream.png'}
          width={21}
          height={30}
          alt=""
        />
        <span>Patidar Doors</span>
      </a>
      <nav className="rb-nav" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.href} href={s.href}>
            {s.name}
          </a>
        ))}
      </nav>
      <a className="rb-cta" href={WA}>
        WhatsApp
      </a>
    </header>
  )
}

export function After({ index = true }: { index?: boolean }) {
  return (
    <>
      {index && (
        <section className="rb-index" aria-labelledby="rb-index-h">
          <h2 id="rb-index-h">Four things, one roof</h2>
          <ol>
            {SECTIONS.map((s, i) => (
              <li key={s.href}>
                <a href={s.href}>
                  <span className="rb-index__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="rb-index__name">{s.name}</span>
                  <span className="rb-index__what">{s.what}</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="rb-visit" aria-labelledby="rb-visit-h">
        <h2 id="rb-visit-h">Come and see it</h2>
        <p className="rb-visit__flow">
          Send us the door you like on WhatsApp. We call you back within 24 hours, measure your doorway in{' '}
          {config.serviceCity} for free, and start making it once you approve the measurements. Half when we
          start, half after it is fitted. Nothing is paid online.
        </p>
        <div className="rb-visit__where">
          <address>{config.storeAddress}</address>
          <p>{config.hours}</p>
        </div>
        <div className="rb-visit__ctas">
          <a className="rb-btn" href={config.mapsUrl}>
            Directions
          </a>
          <a className="rb-btn rb-btn--quiet" href={`tel:${config.phoneTel}`}>
            {config.phoneDisplay}
          </a>
          <a className="rb-btn rb-btn--quiet" href={WA}>
            WhatsApp
          </a>
        </div>
      </section>
      <footer className="rb-foot">Prototype · round 1 · not the live site</footer>
    </>
  )
}
