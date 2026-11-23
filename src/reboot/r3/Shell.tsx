// PROTOTYPE round 3: the header, visit block and footer after each hero. One calm look for the whole round (G's,
// which the owner called closest: white, Gloock, space), so the four are judged on the hero itself. Facts as in
// round 2's shell: the sales flow is the client's, the address, landmark and hours are src/config.ts.
import type { ReactNode } from 'react'
import { config, whatsappLink } from '../../config'

export const WA = whatsappLink('Hello Patidar Doors, I saw your website and would like to visit the store.')
export const LANDMARK = 'Opposite IKEA and Nagasandra metro station, Tumkur Road'

export function Header({ tone = 'dark', children }: { tone?: 'dark' | 'light'; children?: ReactNode }) {
  return (
    <header className={`rb-head r3-head r3-head--${tone}`}>
      <a className="rb-brand" href="#top" aria-label="Patidar Doors">
        <img
          src={tone === 'dark' ? '/images/logo/patidar-mark.png' : '/images/logo/patidar-mark-cream.png'}
          width={21}
          height={30}
          alt=""
        />
        <span>Patidar Doors</span>
      </a>
      <span className="rb-head__extra">{children}</span>
      <a className="rb-cta" href={WA}>
        WhatsApp
      </a>
    </header>
  )
}

export function Visit({ title, lead }: { title: ReactNode; lead?: ReactNode }) {
  return (
    <section className="rb-visit" aria-labelledby="r3-visit-h">
      <h2 id="r3-visit-h">{title}</h2>
      {lead && <p className="rb-visit__lead">{lead}</p>}
      <div className="rb-visit__where">
        <p className="rb-visit__landmark">{LANDMARK}</p>
        <p>{config.hours.replace(' IST', '')}</p>
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
      <p className="rb-visit__flow">
        Send us the door you like on WhatsApp. We call you back within 24 hours, measure your doorway in{' '}
        {config.serviceCity} for free, and start once you approve the measurements. Half when we start, half after
        it is fitted. Nothing is paid online.
      </p>
    </section>
  )
}

export function Foot({ note }: { note?: string }) {
  return (
    <footer className="rb-foot">
      Prototype · round 3 · not the live site · door photos are the catalogue’s placeholders{note ? ` · ${note}` : ''}
    </footer>
  )
}
