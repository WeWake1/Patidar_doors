import { useState } from 'react'
import type { DoorConfig, DoorPricing, PriceBook } from '../data/pricing'
import { calcPrice, defaultConfig, formatSizeLabel, framesFor, hardwareFor, normalizeConfig } from '../data/pricing'
import { COMMON_SIZES } from '../data/products'
import { fmtINR } from '../lib/format'

/**
 * "What a customer pays" — the storefront's own quote, run over the rate card
 * as it is being typed. Same `calcPrice`, same rounding, same breakdown lines,
 * so the owner is looking at the number the site will show, not at an
 * estimate of it. Sizes are the common ones; options are one chip per group
 * so an extra can be checked in one tap.
 */
export function QuotePreview({ pricing, book }: { pricing: DoorPricing; book: PriceBook }) {
  const [raw, setRaw] = useState<Partial<DoorConfig>>({})
  const cfg = normalizeConfig(pricing, book, { ...defaultConfig(pricing, book), ...raw })
  const quote = calcPrice(pricing, book, cfg)
  const sizes = COMMON_SIZES.filter(
    (s) =>
      s.heightIn >= book.limits.height.min &&
      s.heightIn <= book.limits.height.max &&
      s.widthIn >= book.limits.width.min &&
      s.widthIn <= book.limits.width.max,
  )
  const frames = framesFor(pricing, book)
  const hardware = hardwareFor(pricing, book)
  const set = (patch: Partial<DoorConfig>) => setRaw((r) => ({ ...r, ...patch }))

  return (
    <div className="ax-quote">
      <div className="ax-quote__head">
        <span className="ax-preview-label">What a customer pays</span>
        <span className="ax-quote__size">{formatSizeLabel(cfg.heightIn, cfg.widthIn)}</span>
      </div>

      <div className="ax-quote__chips" role="radiogroup" aria-label="Size">
        {sizes.map((s) => {
          const on = s.heightIn === cfg.heightIn && s.widthIn === cfg.widthIn
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`ax-chip${on ? ' is-on' : ''}`}
              onClick={() => set({ heightIn: s.heightIn, widthIn: s.widthIn })}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {pricing.groups
        .filter((g) => g.choices.length > 1 && g.choices.every((c) => c.label))
        .map((g) => (
          <div key={g.id} className="ax-quote__chips" role="radiogroup" aria-label={g.label}>
            {g.choices.map((c) => {
              const on = cfg.choices[g.id] === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`ax-chip ax-chip--sm${on ? ' is-on' : ''}`}
                  onClick={() => set({ choices: { ...cfg.choices, [g.id]: c.id } })}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        ))}

      {(frames.length > 0 || hardware.length > 1) && (
        <div className="ax-quote__chips">
          {frames.length > 0 && (
            <button
              type="button"
              className={`ax-chip ax-chip--sm${cfg.frame !== 'none' ? ' is-on' : ''}`}
              aria-pressed={cfg.frame !== 'none'}
              onClick={() => set({ frame: cfg.frame === 'none' ? 'three' : 'none' })}
            >
              + frame
            </button>
          )}
          {hardware.length > 1 && (
            <button
              type="button"
              className={`ax-chip ax-chip--sm${cfg.hardware !== 'none' ? ' is-on' : ''}`}
              aria-pressed={cfg.hardware !== 'none'}
              onClick={() => set({ hardware: cfg.hardware === 'none' ? hardware[1].id : 'none' })}
            >
              + hardware
            </button>
          )}
        </div>
      )}

      <ul className="ax-quote__lines">
        {quote.breakdown.map((l) => (
          <li key={l.label}>
            <span className="ax-quote__label">
              {l.label}
              {l.note && <span className="ax-quote__note">{l.note}</span>}
            </span>
            <span className="ax-quote__amt">{fmtINR(l.amount)}</span>
          </li>
        ))}
        <li className="ax-quote__total">
          <span className="ax-quote__label">Total · installed</span>
          <span className="ax-quote__amt">{fmtINR(quote.total)}</span>
        </li>
      </ul>
      {pricing.base <= 0 && <p className="ax-hint">Type a rate above and this fills in.</p>}
    </div>
  )
}
