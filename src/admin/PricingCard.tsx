import { Link } from 'react-router-dom'
import type { DoorPricing, OptionChoice, OptionGroup, PriceBook } from '../data/pricing'
import { DEFAULT_REF, GROUP_PRESETS, headlinePrice } from '../data/pricing'
import { COMMON_SIZES } from '../data/products'
import { formatSizeLabel } from '../data/pricing'
import { fmtINR } from '../lib/format'
import { Card, Field, RupeeInput, Switch } from './ui'

/**
 * The door's rate card, edited in the words the owner uses.
 *
 * What the owner types is what a door shop's rate sheet already says: a rate
 * per sq ft (or per leaf at a size), what the other thicknesses cost on top,
 * what a matched back costs. Everything a customer can *choose* on the site is
 * a row here; everything that is the same for every door (frames, hardware,
 * fitting) lives in the price book and is only ticked on or off per door.
 *
 * The card never holds a half-shape. `pricing` is null until "Selling online"
 * is switched on, and switching it on starts from a complete default the
 * storefront could quote with as it stands.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '') || 'x'

function uniqueId(base: string, taken: { id: string }[]): string {
  let id = slug(base)
  let n = 2
  while (taken.some((t) => t.id === id)) id = `${slug(base)}-${n++}`
  return id
}

/** A door that has just been switched on: per leaf at 8′ × 3′, no options yet. */
export function freshPricing(): DoorPricing {
  return { v: 1, unit: 'leaf', ref: { ...DEFAULT_REF }, base: 0, groups: [], frames: 'all', hardware: 'all' }
}

interface Props {
  purchasable: boolean
  pricing: DoorPricing | null
  book: PriceBook
  /** The invented headline the site shows for this door meanwhile, if any. */
  placeholder?: number
  onChange: (patch: { purchasable?: boolean; pricing?: DoorPricing | null }) => void
}

export function PricingCard({ purchasable, pricing, book, placeholder, onChange }: Props) {
  const on = purchasable && pricing !== null
  const set = (patch: Partial<DoorPricing>) => onChange({ pricing: { ...(pricing ?? freshPricing()), ...patch } })

  const unitWord = pricing?.unit === 'sqft' ? 'sq ft' : 'leaf'
  const refLabel = pricing ? formatSizeLabel(pricing.ref.heightIn, pricing.ref.widthIn) : ''
  const refOptions = COMMON_SIZES.some((s) => pricing && s.heightIn === pricing.ref.heightIn && s.widthIn === pricing.ref.widthIn)
    ? COMMON_SIZES
    : pricing
      ? [...COMMON_SIZES, { id: `${pricing.ref.heightIn}x${pricing.ref.widthIn}`, label: refLabel, note: '', ...pricing.ref }]
      : COMMON_SIZES

  const setGroup = (i: number, g: OptionGroup) => set({ groups: pricing!.groups.map((x, j) => (j === i ? g : x)) })
  const removeGroup = (i: number) => set({ groups: pricing!.groups.filter((_, j) => j !== i) })
  const addGroup = (preset?: OptionGroup) => {
    const groups = pricing!.groups
    const base = preset ?? {
      id: 'option',
      label: '',
      choices: [
        { id: 'standard', label: 'Standard', extra: 0, per: 'door' },
        { id: 'upgrade', label: '', extra: 0, per: 'door' },
      ],
    }
    set({ groups: [...groups, { ...base, id: uniqueId(base.id, groups), choices: base.choices.map((c) => ({ ...c })) }] })
  }

  const frames = pricing?.frames ?? 'all'
  const hardware = pricing?.hardware ?? 'all'
  const framesOn = frames === 'all' ? book.frames.length : frames.filter((id) => book.frames.some((f) => f.id === id)).length
  const hardwareOn =
    hardware === 'all' ? book.hardware.length : hardware.filter((id) => book.hardware.some((h) => h.id === id)).length
  const toggleId = (list: 'all' | string[], all: { id: string }[], id: string, checked: boolean): 'all' | string[] => {
    const current = list === 'all' ? all.map((x) => x.id) : list
    const next = checked ? [...new Set([...current, id])] : current.filter((x) => x !== id)
    return next.length === all.length && all.every((x) => next.includes(x.id)) ? 'all' : next
  }

  return (
    <Card
      title="Selling online"
      sub={
        on
          ? 'Customers see a price, size sliders, options and a cart.'
          : placeholder !== undefined
            ? `Off — but the site is showing a placeholder price of ${fmtINR(placeholder)} for this door until a real rate is set here.`
            : 'Off — the page says “price on enquiry” and offers WhatsApp.'
      }
      aside={
        <Switch
          checked={on}
          onChange={(v) => onChange(v ? { purchasable: true, pricing: pricing ?? freshPricing() } : { purchasable: false })}
          label={on ? 'On' : 'Off'}
        />
      }
      className="ax-pricing"
    >
      {on && pricing && (
        <>
          {/* ── the rate ─────────────────────────────────── */}
          <div className="ax-rate">
            <Field label="Rate" className="ax-rate__amount">
              <RupeeInput
                value={pricing.base || null}
                onChange={(v) => set({ base: v ?? 0 })}
                step={pricing.unit === 'sqft' ? 10 : 500}
                placeholder={pricing.unit === 'sqft' ? '1650' : '34000'}
                ariaLabel="Base rate"
              />
            </Field>
            <Field label="per" className="ax-rate__unit">
              <select value={pricing.unit} onChange={(e) => set({ unit: e.target.value === 'sqft' ? 'sqft' : 'leaf' })}>
                <option value="sqft">square foot</option>
                <option value="leaf">leaf (whole door)</option>
              </select>
            </Field>
            {pricing.unit === 'leaf' && (
              <Field label="for a door of" className="ax-rate__ref">
                <select
                  value={`${pricing.ref.heightIn}x${pricing.ref.widthIn}`}
                  onChange={(e) => {
                    const s = refOptions.find((o) => `${o.heightIn}x${o.widthIn}` === e.target.value)
                    if (s) set({ ref: { heightIn: s.heightIn, widthIn: s.widthIn } })
                  }}
                >
                  {refOptions.map((s) => (
                    <option key={s.id} value={`${s.heightIn}x${s.widthIn}`}>
                      {s.label}
                      {s.note ? ` — ${s.note}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <p className="ax-hint">
            {pricing.unit === 'sqft'
              ? `Other sizes scale with area: a ${formatSizeLabel(DEFAULT_REF.heightIn, DEFAULT_REF.widthIn)} door is 24 sq ft.`
              : `Other sizes scale from this door's area (${(
                  (pricing.ref.heightIn * pricing.ref.widthIn) /
                  144
                ).toFixed(1)} sq ft) — a smaller door costs proportionally less.`}
            {pricing.base > 0 && (
              <>
                {' '}
                The card will say <strong>from {fmtINR(headlinePrice(pricing))}</strong>.
              </>
            )}
          </p>

          {/* ── options ──────────────────────────────────── */}
          <div className="ax-groups">
            <div className="ax-groups__head">
              <span className="ax-field__label">Options the customer picks</span>
              <span className="ax-groups__note">First row is included in the rate. Others add to it.</span>
            </div>
            {pricing.groups.map((g, gi) => (
              <GroupEditor
                key={g.id}
                group={g}
                unitWord={unitWord}
                onChange={(next) => setGroup(gi, next)}
                onRemove={() => removeGroup(gi)}
              />
            ))}
            <div className="ax-groups__add">
              <span className="ax-groups__add-label">Add</span>
              {GROUP_PRESETS.filter((p) => !pricing.groups.some((g) => g.id === p.id)).map((p) => (
                <button key={p.id} type="button" className="ax-chip" onClick={() => addGroup(p)}>
                  + {p.label}
                </button>
              ))}
              <button type="button" className="ax-chip" onClick={() => addGroup()}>
                + Something else
              </button>
            </div>
          </div>

          {/* ── frames & hardware ───────────────────────────── */}
          <details className="ax-details">
            <summary>
              <span>Frames &amp; hardware</span>
              <span className="ax-details__meta">
                {framesOn} of {book.frames.length} frame types · {hardwareOn} of {book.hardware.length} hardware sets
              </span>
            </summary>
            <div className="ax-details__body">
              <p className="ax-hint">
                Prices come from the <Link to="/admin/pricing">price book</Link>. Untick anything this door isn't offered
                with.
              </p>
              <div className="ax-ticklists">
                <div className="ax-ticklist">
                  <span className="ax-field__label">Frame types</span>
                  {book.frames.length === 0 && <span className="ax-hint">None in the price book yet.</span>}
                  {book.frames.map((f) => (
                    <label key={f.id} className="ax-checkbox">
                      <input
                        type="checkbox"
                        checked={frames === 'all' || frames.includes(f.id)}
                        onChange={(e) => set({ frames: toggleId(frames, book.frames, f.id, e.target.checked) })}
                      />
                      <span>
                        {f.name} <em>{fmtINR(f.ratePerRft)}/rft</em>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="ax-ticklist">
                  <span className="ax-field__label">Hardware</span>
                  {book.hardware.length === 0 && <span className="ax-hint">None in the price book yet.</span>}
                  {book.hardware.map((h) => (
                    <label key={h.id} className="ax-checkbox">
                      <input
                        type="checkbox"
                        checked={hardware === 'all' || hardware.includes(h.id)}
                        onChange={(e) => set({ hardware: toggleId(hardware, book.hardware, h.id, e.target.checked) })}
                      />
                      <span>
                        {h.name} <em>{fmtINR(h.price)}</em>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </>
      )}
    </Card>
  )
}

/* ── one option group ─────────────────────────────────── */

function GroupEditor({
  group,
  unitWord,
  onChange,
  onRemove,
}: {
  group: OptionGroup
  unitWord: string
  onChange: (g: OptionGroup) => void
  onRemove: () => void
}) {
  const setChoice = (i: number, patch: Partial<OptionChoice>) =>
    onChange({ ...group, choices: group.choices.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const addChoice = () =>
    onChange({
      ...group,
      choices: [...group.choices, { id: uniqueId('choice', group.choices), label: '', extra: 0, per: group.choices[0]?.per ?? 'door' }],
    })
  const removeChoice = (i: number) => onChange({ ...group, choices: group.choices.filter((_, j) => j !== i) })
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= group.choices.length) return
    const next = group.choices.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    // The first row is the included one, so a choice moved to the top carries
    // no extra and the one it displaced keeps whatever it cost.
    onChange({ ...group, choices: next.map((c, k) => (k === 0 ? { ...c, extra: 0 } : c)) })
  }

  return (
    <div className="ax-group">
      <div className="ax-group__head">
        <input
          className="ax-group__label"
          value={group.label}
          placeholder="Option name (e.g. Polish)"
          maxLength={40}
          aria-label="Option name"
          onChange={(e) => onChange({ ...group, label: e.target.value })}
        />
        <button type="button" className="ax-link ax-link--quiet" onClick={onRemove}>
          Remove option
        </button>
      </div>
      <div className="ax-group__rows">
        {group.choices.map((c, i) => (
          <div key={c.id} className={`ax-choice${i === 0 ? ' ax-choice--base' : ''}`}>
            <div className="ax-choice__order">
              <button type="button" className="ax-ib" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button
                type="button"
                className="ax-ib"
                aria-label="Move down"
                disabled={i === group.choices.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
            </div>
            <input
              className="ax-choice__label"
              value={c.label}
              placeholder={i === 0 ? 'Included choice (e.g. 30 mm)' : 'Choice (e.g. 32 mm)'}
              maxLength={40}
              aria-label="Choice"
              onChange={(e) => setChoice(i, { label: e.target.value })}
            />
            <input
              className="ax-choice__note"
              value={c.note ?? ''}
              placeholder="note (optional)"
              maxLength={40}
              aria-label="Note"
              onChange={(e) => setChoice(i, { note: e.target.value || undefined })}
            />
            {i === 0 ? (
              <span className="ax-choice__included">Included</span>
            ) : (
              <span className="ax-choice__extra">
                <RupeeInput
                  value={c.extra || null}
                  onChange={(v) => setChoice(i, { extra: v ?? 0 })}
                  allowNegative
                  ariaLabel="Extra"
                  placeholder="0"
                />
                <select
                  value={c.per}
                  aria-label="Charged per"
                  onChange={(e) => setChoice(i, { per: e.target.value === 'unit' ? 'unit' : 'door' })}
                >
                  <option value="door">per door</option>
                  <option value="unit">per {unitWord}</option>
                </select>
              </span>
            )}
            <button
              type="button"
              className="ax-ib"
              aria-label="Remove choice"
              disabled={group.choices.length <= 1}
              onClick={() => removeChoice(i)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="ax-link" onClick={addChoice}>
        + Add a choice
      </button>
    </div>
  )
}
