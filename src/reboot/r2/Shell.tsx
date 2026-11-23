// PROTOTYPE round 2: the header and the short visit block after each hero, shared so the four can be judged in
// context. Each variant themes them with its own tokens (.ve .vf .vg .vh). Every line is a confirmed fact: the
// sales flow is the client's (decisions.md, "Carried over"), the address, landmark, hours and numbers are
// src/config.ts (the address reads "Opp IKEA & Nagsandra Metro Station").
import type { ReactNode } from 'react'
import { config, whatsappLink } from '../../config'

export const WA = whatsappLink('Hello Patidar Doors, I saw your website and would like to visit the store.')
export const LANDMARK = 'Opposite IKEA and Nagasandra metro station, Tumkur Road'

export function Header({ mark = 'dark', children }: { mark?: 'dark' | 'light'; children?: ReactNode }) {
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
      <span className="rb-head__extra">{children}</span>
      <a className="rb-cta" href={WA}>
        WhatsApp
      </a>
    </header>
  )
}

export function Visit({ id = 'visit', title, lead }: { id?: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <section className="rb-visit" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
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
      Prototype · round 2 · not the live site{note ? ` · ${note}` : ''}
    </footer>
  )
}
