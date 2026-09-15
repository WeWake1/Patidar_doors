import type { ReactNode } from 'react'

/**
 * The handful of pieces every admin screen is built from. Deliberately few:
 * a card with a title, a labelled field, a rupee box, a switch and a notice.
 * Anything a screen needs beyond these is written in that screen.
 */

export function Card({
  title,
  sub,
  aside,
  children,
  className = '',
}: {
  title?: ReactNode
  /** One line under the title saying what the card is for. */
  sub?: ReactNode
  /** Sits at the right of the head — a switch, a count, an action. */
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`ax-card ${className}`.trim()}>
      {(title || aside) && (
        <header className="ax-card__head">
          <div>
            {title && <h2 className="ax-card__title">{title}</h2>}
            {sub && <p className="ax-card__sub">{sub}</p>}
          </div>
          {aside}
        </header>
      )}
      <div className="ax-card__body">{children}</div>
    </section>
  )
}

export function Field({
  label,
  hint,
  children,
  className = '',
  as: As = 'label',
}: {
  label: ReactNode
  /** Under the control, quieter. */
  hint?: ReactNode
  children: ReactNode
  className?: string
  /** `div` when the control is a group (several inputs) rather than one. */
  as?: 'label' | 'div'
}) {
  return (
    <As className={`ax-field ${className}`.trim()}>
      <span className="ax-field__label">{label}</span>
      {children}
      {hint && <span className="ax-field__hint">{hint}</span>}
    </As>
  )
}

/**
 * A ₹ box. Holds a number or nothing — never `0` for "blank", because the
 * difference between "free" and "not filled in" is what a required-price
 * check has to see.
 */
export function RupeeInput({
  value,
  onChange,
  suffix,
  placeholder = '0',
  min = 0,
  step = 1,
  allowNegative = false,
  ariaLabel,
  className = '',
}: {
  value: number | null
  onChange: (v: number | null) => void
  /** e.g. `per sq ft` */
  suffix?: ReactNode
  placeholder?: string
  min?: number
  step?: number
  allowNegative?: boolean
  ariaLabel?: string
  className?: string
}) {
  return (
    <span className={`ax-money ${className}`.trim()}>
      <span className="ax-money__sign" aria-hidden="true">
        ₹
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={allowNegative ? undefined : min}
        step={step}
        placeholder={placeholder}
        value={value ?? ''}
        aria-label={ariaLabel}
        onChange={(e) => {
          const raw = e.target.value
          if (raw === '') return onChange(null)
          const n = Number(raw)
          onChange(Number.isFinite(n) ? n : null)
        }}
      />
      {suffix && <span className="ax-money__unit">{suffix}</span>}
    </span>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  disabled?: boolean
}) {
  return (
    <label className={`ax-switch${checked ? ' is-on' : ''}${disabled ? ' is-off' : ''}`}>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="ax-switch__track" aria-hidden="true">
        <span className="ax-switch__knob" />
      </span>
      <span className="ax-switch__label">{label}</span>
    </label>
  )
}

/**
 * Status in the shop floor's own colours — clay for a fault, slate for a
 * confirmation, teak for a caution — each with its rotated square and its own
 * words, so none of them depends on the colour being seen.
 */
export function Notice({ kind = 'info', children, role }: { kind?: 'fault' | 'ok' | 'warn' | 'info'; children: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div className={`ax-note ax-note--${kind}`} role={role}>
      {children}
    </div>
  )
}

/** The small status tag on a catalogue row. */
export function Tag({ kind = 'plain', children }: { kind?: 'plain' | 'ok' | 'warn' | 'fault'; children: ReactNode }) {
  return <span className={`ax-tag ax-tag--${kind}`}>{children}</span>
}
