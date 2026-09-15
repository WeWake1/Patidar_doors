import { useId } from 'react'
import type { CSSProperties } from 'react'
import type { DoorConfig, DoorPricing, PriceBook, PriceResult } from '../data/pricing'
import {
  FRAME_DESIGN_OPTIONS,
  FRAME_OPTIONS,
  SIZE_STEP,
  formatFtIn,
  formatInches,
  framesFor,
  hardwareFor,
} from '../data/pricing'
import { COMMON_SIZES } from '../data/products'
import { fmtINR } from '../lib/format'

/* ── one dimension ─────────────────────────────────────── */

interface DimSliderProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  /** Field name used by the E2E script and by the label association. */
  name: string
}

/**
 * A single dimension. Native `<input type="range">` rather than a slider
 * library: it is keyboard- and screen-reader-correct out of the box, drags
 * properly under a thumb on a phone, and costs no bytes on a site that is
 * already lazy-loading three.js. The ± buttons nudge by one ¼″ step, because
 * hitting an exact quarter-inch by dragging on a 360px screen is hopeless.
 */
function DimSlider({ label, value, min, max, onChange, name }: DimSliderProps) {
  const id = useId()
  const step = SIZE_STEP
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="dim">
      <div className="dim__head">
        <label className="dim__label" htmlFor={id}>
          {label}
        </label>
        <output className="dim__value" htmlFor={id}>
          <span className="dim__value-in">{formatInches(value)}</span>
          <span className="dim__value-ft">{formatFtIn(value)}</span>
        </output>
      </div>

      <div className="dim__row">
        <button
          type="button"
          className="dim__nudge"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()} by a quarter inch`}
        >
          −
        </button>

        <div className="dim__track" style={{ '--dim-pct': `${pct}%` } as CSSProperties}>
          <input
            id={id}
            name={name}
            className="dim__input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            aria-label={`${label} in inches`}
            aria-valuetext={`${formatInches(value)}, ${formatFtIn(value)}`}
          />
        </div>

        <button
          type="button"
          className="dim__nudge"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()} by a quarter inch`}
        >
          +
        </button>
      </div>

      <div className="dim__ends">
        <span>{formatFtIn(min)}</span>
        <span>{formatFtIn(max)}</span>
      </div>
    </div>
  )
}

/* ── one set of option chips ───────────────────────────── */

interface ChipGroupProps<T extends string> {
  legend: string
  options: { id: T; label: string; note: string }[]
  value: T
  onChange: (v: T) => void
  /** Shown under the chips when set. */
  hint?: string
}

function ChipGroup<T extends string>({ legend, options, value, onChange, hint }: ChipGroupProps<T>) {
  return (
    <fieldset className="cfg cfg--opt">
      <legend>{legend}</legend>
      <div className="cfg__opts" role="radiogroup" aria-label={legend}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            className={`cfg__size cfg__opt${value === o.id ? ' cfg__size--on' : ''}`}
            onClick={() => onChange(o.id)}
          >
            <span className="cfg__size-label">{o.label}</span>
            <span className="cfg__size-note">{o.note}</span>
          </button>
        ))}
      </div>
      {hint && <div className="cfg__hint">{hint}</div>}
    </fieldset>
  )
}

/* ── the configurator ──────────────────────────────────── */

interface Props {
  /** The door's own rate card — what the groups and the offered frames/hardware come from. */
  pricing: DoorPricing
  /** The shop-wide book — frame types, hardware sets, size limits. */
  book: PriceBook
  config: DoorConfig
  onChange: (next: DoorConfig) => void
  quote: PriceResult
}

/**
 * Every group of chips here is data: the door's option groups (thickness,
 * back side, whatever the owner added) and the price book's frames and
 * hardware. Nothing about a specific option is written into this component,
 * so an option added in /admin is on the page the moment the live read lands.
 */
export function DoorConfigurator({ pricing, book, config, onChange, quote }: Props) {
  const set = <K extends keyof DoorConfig>(key: K, value: DoorConfig[K]) => onChange({ ...config, [key]: value })
  const choose = (groupId: string, choiceId: string) =>
    onChange({ ...config, choices: { ...config.choices, [groupId]: choiceId } })

  const limits = book.limits
  const ticks = COMMON_SIZES.filter(
    (s) =>
      s.heightIn >= limits.height.min && s.heightIn <= limits.height.max &&
      s.widthIn >= limits.width.min && s.widthIn <= limits.width.max,
  )
  const matchesCommon = (h: number, w: number) => ticks.find((s) => s.heightIn === h && s.widthIn === w)
  const current = matchesCommon(config.heightIn, config.widthIn)
  const frames = framesFor(pricing, book)
  const hardware = hardwareFor(pricing, book)
  const rupee = (n: number) => (n > 0 ? `+${fmtINR(n)}` : n < 0 ? `−${fmtINR(-n)}` : 'Included')

  return (
    <>
      <fieldset className="cfg cfg--size">
        <legend>Size — any measurement, to the quarter inch</legend>

        <DimSlider
          name="height"
          label="Height"
          value={config.heightIn}
          min={limits.height.min}
          max={limits.height.max}
          onChange={(v) => set('heightIn', v)}
        />
        <DimSlider
          name="width"
          label="Width"
          value={config.widthIn}
          min={limits.width.min}
          max={limits.width.max}
          onChange={(v) => set('widthIn', v)}
        />

        <div className="cfg__ticks">
          <span className="cfg__ticks-label">Common sizes</span>
          {ticks.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`cfg__tick${current?.id === s.id ? ' cfg__tick--on' : ''}`}
              onClick={() => onChange({ ...config, heightIn: s.heightIn, widthIn: s.widthIn })}
              aria-pressed={current?.id === s.id}
              title={s.note}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="cfg__hint">
          {quote.panel ? (
            quote.snapped ? (
              <>
                Cut from a {quote.panel.heightIn}″ × {quote.panel.widthIn}″ board ({quote.panel.sqft} sq ft) — that
                board is what you pay for, so the price holds steady until your size needs the next one up.
              </>
            ) : (
              <>
                A stock {quote.panel.heightIn}″ × {quote.panel.widthIn}″ board ({quote.panel.sqft} sq ft), cut with
                nothing wasted.
              </>
            )
          ) : (
            <>Priced on the exact size — {quote.area} sq ft.</>
          )}{' '}
          Exact dimensions are confirmed at the free measurement visit.
        </div>
      </fieldset>

      {pricing.groups
        .filter((g) => g.choices.length > 1)
        .map((g) => (
          <ChipGroup
            key={g.id}
            legend={g.label}
            options={g.choices.map((c) => ({
              id: c.id,
              label: c.label,
              note: c.note ?? (c.per === 'unit' && c.extra ? `${rupee(c.extra)} per ${pricing.unit === 'sqft' ? 'sq ft' : 'leaf'}` : rupee(c.extra)),
            }))}
            value={config.choices[g.id] ?? g.choices[0].id}
            onChange={(v) => choose(g.id, v)}
          />
        ))}

      {frames.length > 0 && (
        <ChipGroup
          legend="Frame — chaukhat"
          options={FRAME_OPTIONS}
          value={config.frame}
          onChange={(v) => set('frame', v)}
        />
      )}

      {config.frame !== 'none' && frames.length > 0 && (
        <>
          <ChipGroup
            legend="Frame type"
            options={frames.map((f) => ({ id: f.id, label: f.name, note: f.note ?? `${fmtINR(f.ratePerRft)} per running ft` }))}
            value={config.frameType}
            onChange={(v) => set('frameType', v)}
            hint={`${quote.frameRft} running feet at this size.`}
          />
          {book.frameDesignExtra > 0 && (
            <ChipGroup
              legend="Frame design"
              options={FRAME_DESIGN_OPTIONS}
              value={config.frameDesign}
              onChange={(v) => set('frameDesign', v)}
            />
          )}
        </>
      )}

      {hardware.length > 1 && (
        <ChipGroup
          legend="Hardware"
          options={hardware.map((h) => ({ id: h.id, label: h.name, note: h.note ?? fmtINR(h.price) }))}
          value={config.hardware}
          onChange={(v) => set('hardware', v)}
        />
      )}
    </>
  )
}

/**
 * Rendered by the PDP *after* the finish swatches rather than inside the
 * configurator — the finish is one of the lines it itemises, and a total that
 * appears before its own inputs reads like a mistake.
 */
export function PriceBreakdown({ quote }: { quote: PriceResult }) {
  return (
    <details className="cfg__break">
      <summary>
        What makes up {fmtINR(quote.total)}
        <span className="cfg__break-count">
          {quote.breakdown.length} {quote.breakdown.length === 1 ? 'item' : 'items'}
        </span>
      </summary>
      <ul className="cfg__break-list">
        {quote.breakdown.map((line) => (
          <li key={line.label}>
            <span className="cfg__break-label">
              {line.label}
              {line.note && <span className="cfg__break-note">{line.note}</span>}
            </span>
            <span className="cfg__break-amt">{fmtINR(line.amount)}</span>
          </li>
        ))}
        <li className="cfg__break-total">
          <span className="cfg__break-label">Total · installed</span>
          <span className="cfg__break-amt">{fmtINR(quote.total)}</span>
        </li>
      </ul>
    </details>
  )
}
