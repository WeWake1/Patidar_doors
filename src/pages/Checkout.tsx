import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { config, whatsappLink } from '../config'
import { fmtINR, fmtINROrder, makeOrderId } from '../lib/format'
import { t } from '../lib/i18n'
import { saveLastOrder, type OrderCustomer } from '../lib/order'
import { smoothScrollTo } from '../lib/smoothScroll'
import { usePageMeta } from '../lib/usePageMeta'

const SLOTS = [
  'Weekday morning (9–12)',
  'Weekday afternoon (12–4)',
  'Weekday evening (4–7)',
  'Saturday morning (9–12)',
  'Saturday afternoon (12–4)',
]

/**
 * Field ceilings. These are not arbitrary tidiness — the order leaves as a
 * `wa.me` URL and every character is spent twice once it is percent-encoded.
 * Capping at the field is the kind fix; the whole-message check below is the
 * backstop for the case no single field causes (a large cart).
 */
const LIMITS = {
  name: 80,
  phone: 20,
  email: 120,
  address: 300,
  city: 60,
  notes: 500,
} as const

/**
 * The longest `wa.me` URL worth trying. WhatsApp itself takes far more, but the
 * in-app browsers this link is opened from (Instagram, Gmail, some Android
 * OEM shells) truncate long URLs silently — a truncated order is worse than a
 * refused one, because nobody finds out until the workshop cuts the wrong door.
 */
const MAX_URL = 1900

const EMPTY: OrderCustomer = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  pincode: '',
  slot: SLOTS[0],
  notes: '',
}

type Errors = Partial<Record<keyof OrderCustomer, string>>

function validate(c: OrderCustomer): Errors {
  const errors: Errors = {}
  if (c.name.trim().length < 2) errors.name = t('checkout.e.name')
  else if (c.name.length > LIMITS.name) errors.name = t('checkout.e.nameLong')
  const phone = c.phone.replace(/[\s-]/g, '').replace(/^\+91/, '')
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = t('checkout.e.phone')
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) errors.email = t('checkout.e.email')
  if (c.address.trim().length < 8) errors.address = t('checkout.e.address')
  else if (c.address.length > LIMITS.address) errors.address = t('checkout.e.addressLong')
  if (c.city.trim().length < 2) errors.city = t('checkout.e.city')
  if (!/^\d{6}$/.test(c.pincode.trim())) errors.pincode = t('checkout.e.pincode')
  if (c.notes.length > LIMITS.notes) errors.notes = t('checkout.e.notesLong', { max: LIMITS.notes })
  return errors
}

export function Checkout() {
  usePageMeta('Checkout', 'Book your doors — pay only after the free measurement visit.')
  const cart = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState<OrderCustomer>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  /** Form-level failure — the message is too long, or nothing is wrong per field. */
  const [formError, setFormError] = useState<string | null>(null)
  /**
   * Latched for the whole handoff. `window.open` plus a route change is not
   * instant on a mid-range phone, and a second tap in that window used to mint
   * a second order id, overwrite the saved order and open WhatsApp twice.
   */
  const [handing, setHanding] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  const set = (k: keyof OrderCustomer) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  if (cart.lines.length === 0) {
    return (
      <div className="page-pad checkout checkout--empty">
        <h1 className="page-title">{t('checkout.title')}</h1>
        <p className="checkout__empty-msg">{t('checkout.empty')}</p>
        <Link to="/shop" className="btn btn--dark">
          {t('cart.browse')}
        </Link>
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (handing) return
    setFormError(null)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      // Move to the summary, not the first bad field: a screen reader needs the
      // count announced, and a sighted visitor needs to know how many more are
      // coming before they start typing.
      const el = summaryRef.current ?? document.querySelector<HTMLElement>('.field--error input, .field--error textarea')
      if (el) smoothScrollTo(el, { offset: -(window.innerHeight - el.getBoundingClientRect().height) / 2 })
      return
    }

    const id = makeOrderId()
    // The workshop reads this message to cut the door, so it carries the exact
    // measured size in inches alongside the feet-inches the customer saw — and
    // it is formatted en-IN whatever locale the customer was browsing in.
    const lineText = cart.lines
      .map((l) =>
        [
          `• ${l.qty} × ${l.name}`,
          `   ${l.sizeLabel} (${l.sizeInches})`,
          `   ${l.toneName} · ${l.optsLabel}`,
          `   ${fmtINROrder(l.unitPrice)} each`,
        ].join('\n'),
      )
      .join('\n')
    const message = [
      `🚪 NEW ORDER — ${id}`,
      '━━━━━━━━━━━━━━',
      lineText,
      '',
      `Subtotal: ${fmtINROrder(cart.subtotal)} (measurement & installation included)`,
      '',
      `Name: ${form.name.trim()}`,
      `Phone: ${form.phone.trim()}`,
      form.email.trim() ? `Email: ${form.email.trim()}` : '',
      `Address: ${form.address.trim()}, ${form.city.trim()} — ${form.pincode.trim()}`,
      `Preferred visit: ${form.slot}`,
      form.notes.trim() ? `Notes: ${form.notes.trim()}` : '',
      '',
      `(Placed on the ${config.brand} website — pay after the measurement visit)`,
    ]
      .filter((l) => l !== '')
      .join('\n')

    const waUrl = whatsappLink(message)
    if (waUrl.length > MAX_URL) {
      setFormError(t('checkout.e.tooLong'))
      if (summaryRef.current) {
        smoothScrollTo(summaryRef.current, { offset: -160 })
      }
      return
    }

    setHanding(true)
    // Opened before the save so it still counts as the submit gesture — an
    // await or a slow write here is enough for Safari to treat the window as
    // unrequested and refuse it.
    const opened = window.open(waUrl, '_blank', 'noopener')
    saveLastOrder({
      id,
      ts: Date.now(),
      subtotal: cart.subtotal,
      waUrl,
      // A blocked pop-up is the one case where the customer has no idea the
      // handoff didn't happen. The confirmation page leads with the button
      // instead of the receipt when this is set.
      blocked: !opened,
      customer: form,
      lines: cart.lines.map((l) => ({
        name: l.name,
        sizeLabel: l.sizeLabel,
        toneName: l.toneName,
        optsLabel: l.optsLabel,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    })
    cart.clear()
    navigate('/order-confirmed')
  }

  /**
   * `render` receives the wiring rather than the caller assembling it, so no
   * field can ship without `aria-invalid` and without its error or hint bound
   * by `aria-describedby` — which is what makes the error reachable to a screen
   * reader at all, rather than just visible underneath.
   */
  const field = (
    k: keyof OrderCustomer,
    label: string,
    render: (props: {
      id: string
      'aria-invalid'?: true
      'aria-describedby'?: string
      maxLength?: number
    }) => ReactNode,
    hint?: string,
  ) => {
    const id = `f-${k}`
    const err = errors[k]
    const describedBy = err ? `${id}-err` : hint ? `${id}-hint` : undefined
    return (
      <div className={`field${err ? ' field--error' : ''}`}>
        <label htmlFor={id}>{label}</label>
        {render({
          id,
          ...(err ? { 'aria-invalid': true as const } : {}),
          ...(describedBy ? { 'aria-describedby': describedBy } : {}),
          maxLength: LIMITS[k as keyof typeof LIMITS],
        })}
        {err ? (
          <div className="field__err" id={`${id}-err`}>
            {err}
          </div>
        ) : hint ? (
          <div className="field__hint" id={`${id}-hint`}>
            {hint}
          </div>
        ) : null}
      </div>
    )
  }

  const errorCount = Object.keys(errors).length
  const notesLeft = LIMITS.notes - form.notes.length

  return (
    <div className="page-pad checkout">
      <div className="kicker">Almost there</div>
      <h1 className="page-title">{t('checkout.title')}</h1>
      <p className="checkout__sub">
        This doesn’t take a payment. It writes your order into a WhatsApp message for you to send us — once it arrives
        we call within 24 hours to book your <strong>free measurement visit</strong> in {config.serviceCity}.
      </p>

      <div className="checkout__grid">
        <form className="checkout__form" onSubmit={submit} noValidate>
          <h2 className="checkout__h2">{t('checkout.h.details')}</h2>

          {/* One live region for the whole form. Per-field `role="alert"` fired
              six announcements at once on a failed submit and the visitor heard
              none of them; this says how many and the fields say which. */}
          <div ref={summaryRef} className="checkout__alert-slot" role="alert" aria-live="assertive">
            {formError ? (
              <div className="checkout__alert">{formError}</div>
            ) : errorCount > 0 ? (
              <div className="checkout__alert">{t('checkout.errorSummary', { count: errorCount })}</div>
            ) : null}
          </div>

          {field('name', t('checkout.f.name'), (a) => (
            <input {...a} type="text" autoComplete="name" value={form.name} onChange={set('name')} />
          ))}
          <div className="field-row">
            {field(
              'phone',
              t('checkout.f.phone'),
              (a) => (
                <input
                  {...a}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={form.phone}
                  onChange={set('phone')}
                />
              ),
              t('checkout.f.phoneHint'),
            )}
            {field('email', t('checkout.f.email'), (a) => (
              <input {...a} type="email" autoComplete="email" value={form.email} onChange={set('email')} />
            ))}
          </div>
          {field('address', t('checkout.f.address'), (a) => (
            <textarea
              {...a}
              rows={3}
              autoComplete="street-address"
              placeholder={t('checkout.f.addressPlaceholder')}
              value={form.address}
              onChange={set('address')}
            />
          ))}
          <div className="field-row">
            {field('city', t('checkout.f.city'), (a) => (
              <input {...a} type="text" autoComplete="address-level2" value={form.city} onChange={set('city')} />
            ))}
            {field('pincode', t('checkout.f.pincode'), (a) => (
              <input
                {...a}
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="postal-code"
                value={form.pincode}
                onChange={set('pincode')}
              />
            ))}
          </div>
          {field('slot', t('checkout.f.slot'), (a) => (
            <select {...a} value={form.slot} onChange={set('slot')}>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ))}
          {field(
            'notes',
            t('checkout.f.notes'),
            (a) => (
              <textarea
                {...a}
                rows={2}
                placeholder={t('checkout.f.notesPlaceholder')}
                value={form.notes}
                onChange={set('notes')}
              />
            ),
            // Only counts down once it starts to matter — a counter sitting at
            // "500 characters left" under an empty box reads as a warning.
            notesLeft <= 120 ? t('checkout.charsLeft', { n: notesLeft }) : undefined,
          )}

          {/* Names what the button actually does. It opens WhatsApp with the
              order written out; the customer still has to hit send, and until
              they do we have nothing. "Place order" claimed an outcome this
              flow cannot deliver. */}
          <button type="submit" className="btn btn--dark btn--big btn--block" disabled={handing}>
            {handing ? t('checkout.submitting') : t('checkout.submit')}
          </button>
          <div className="checkout__fine">
            Opens a message to our team ({config.phoneDisplay}) with your doors, sizes and address filled in. Send it
            and the order is with us. No payment is collected online.
          </div>
        </form>

        <aside className="checkout__summary">
          <h2 className="checkout__h2">{t('checkout.h.doors')}</h2>
          {cart.lines.map((l) => (
            <div key={l.key} className="checkout__line">
              <div>
                <div className="checkout__line-name">
                  {l.qty} × {l.name}
                </div>
                <div className="checkout__line-meta">
                  {l.sizeLabel} · {l.toneName}
                </div>
                <div className="checkout__line-meta">{l.optsLabel}</div>
              </div>
              <div className="checkout__line-price">{fmtINR(l.lineTotal)}</div>
            </div>
          ))}
          <div className="checkout__row">
            <span>Measurement & installation in {config.serviceCity}</span>
            <span className="drawer__included">{t('cart.includedValue')}</span>
          </div>
          <div className="checkout__row checkout__row--total">
            <span>{t('cart.subtotal')}</span>
            <span>{fmtINR(cart.subtotal)}</span>
          </div>
          <div className="checkout__pay">
            <div className="checkout__pay-step">
              <span>Today</span>
              <strong>{fmtINR(0)}</strong>
            </div>
            <div className="checkout__pay-step">
              <span>After measurement</span>
              <strong>{fmtINR(Math.round(cart.subtotal / 2 / 100) * 100)}</strong>
            </div>
            <div className="checkout__pay-step">
              <span>After installation</span>
              <strong>Balance</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
