import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { config, whatsappLink } from '../config'
import { fmtINR, makeOrderId } from '../lib/format'
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
  if (c.name.trim().length < 2) errors.name = 'Please enter your full name.'
  const phone = c.phone.replace(/[\s-]/g, '').replace(/^\+91/, '')
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.'
  if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) errors.email = 'That email doesn’t look right.'
  if (c.address.trim().length < 8) errors.address = 'Please enter your full address.'
  if (c.city.trim().length < 2) errors.city = 'Please enter your city.'
  if (!/^\d{6}$/.test(c.pincode.trim())) errors.pincode = 'Enter your 6-digit pincode.'
  return errors
}

export function Checkout() {
  usePageMeta('Checkout', 'Book your doors — pay only after the free measurement visit.')
  const cart = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState<OrderCustomer>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})

  const set = (k: keyof OrderCustomer) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  if (cart.lines.length === 0) {
    return (
      <div className="page-pad checkout checkout--empty">
        <h1 className="page-title">Checkout</h1>
        <p className="checkout__empty-msg">Your cart is empty — every great room starts at the door.</p>
        <Link to="/shop" className="btn btn--dark">
          Browse doors
        </Link>
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      const el = document.querySelector<HTMLElement>('.field--error input, .field--error textarea')
      if (el) smoothScrollTo(el, { offset: -(window.innerHeight - el.getBoundingClientRect().height) / 2 })
      return
    }

    const id = makeOrderId()
    const lineText = cart.lines
      .map((l) => `• ${l.qty} × ${l.name}\n   ${l.sizeLabel} · ${l.toneName} · ${fmtINR(l.unitPrice)} each`)
      .join('\n')
    const message = [
      `🚪 NEW ORDER — ${id}`,
      '━━━━━━━━━━━━━━',
      lineText,
      '',
      `Subtotal: ${fmtINR(cart.subtotal)} (measurement & installation included)`,
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
    saveLastOrder({
      id,
      ts: Date.now(),
      subtotal: cart.subtotal,
      waUrl,
      customer: form,
      lines: cart.lines.map((l) => ({
        name: l.name,
        sizeLabel: l.sizeLabel,
        toneName: l.toneName,
        qty: l.qty,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
    })
    window.open(waUrl, '_blank', 'noopener')
    cart.clear()
    navigate('/order-confirmed')
  }

  const field = (
    k: keyof OrderCustomer,
    label: string,
    input: React.ReactNode,
    hint?: string,
  ) => (
    <div className={`field${errors[k] ? ' field--error' : ''}`}>
      <label htmlFor={`f-${k}`}>{label}</label>
      {input}
      {errors[k] ? <div className="field__err" role="alert">{errors[k]}</div> : hint ? <div className="field__hint">{hint}</div> : null}
    </div>
  )

  return (
    <div className="page-pad checkout">
      <div className="kicker">Almost there</div>
      <h1 className="page-title">Checkout</h1>
      <p className="checkout__sub">
        Placing an order books your <strong>free measurement visit</strong> — you pay nothing today. The order is sent
        to us on WhatsApp; we call within 24 hours to schedule.
      </p>

      <div className="checkout__grid">
        <form className="checkout__form" onSubmit={submit} noValidate>
          <h2 className="checkout__h2">Delivery details</h2>
          {field('name', 'Full name', <input id="f-name" type="text" autoComplete="name" value={form.name} onChange={set('name')} />)}
          <div className="field-row">
            {field(
              'phone',
              'Mobile number',
              <input id="f-phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="98765 43210" value={form.phone} onChange={set('phone')} />,
              'We call this number to schedule the visit.',
            )}
            {field('email', 'Email (optional)', <input id="f-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />)}
          </div>
          {field(
            'address',
            'Address',
            <textarea id="f-address" rows={3} autoComplete="street-address" placeholder="Flat / house, building, street, landmark" value={form.address} onChange={set('address')} />,
          )}
          <div className="field-row">
            {field('city', 'City', <input id="f-city" type="text" autoComplete="address-level2" value={form.city} onChange={set('city')} />)}
            {field('pincode', 'Pincode', <input id="f-pincode" type="text" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={form.pincode} onChange={set('pincode')} />)}
          </div>
          {field(
            'slot',
            'Preferred visit time',
            <select id="f-slot" value={form.slot} onChange={set('slot')}>
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>,
          )}
          {field(
            'notes',
            'Notes (optional)',
            <textarea id="f-notes" rows={2} placeholder="Exact opening size, floor number, anything we should know" value={form.notes} onChange={set('notes')} />,
          )}

          <button type="submit" className="btn btn--dark btn--big btn--block">
            Place order on WhatsApp
          </button>
          <div className="checkout__fine">
            Sends your order as a WhatsApp message to our team ({config.phoneDisplay}). No payment is collected online.
          </div>
        </form>

        <aside className="checkout__summary">
          <h2 className="checkout__h2">Your doors</h2>
          {cart.lines.map((l) => (
            <div key={l.key} className="checkout__line">
              <div>
                <div className="checkout__line-name">
                  {l.qty} × {l.name}
                </div>
                <div className="checkout__line-meta">
                  {l.sizeLabel} · {l.toneName}
                </div>
              </div>
              <div className="checkout__line-price">{fmtINR(l.lineTotal)}</div>
            </div>
          ))}
          <div className="checkout__row">
            <span>Measurement visit & installation</span>
            <span className="drawer__included">Included</span>
          </div>
          <div className="checkout__row checkout__row--total">
            <span>Subtotal</span>
            <span>{fmtINR(cart.subtotal)}</span>
          </div>
          <div className="checkout__pay">
            <div className="checkout__pay-step">
              <span>Today</span>
              <strong>₹0</strong>
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
