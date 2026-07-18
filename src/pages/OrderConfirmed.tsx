import { Link } from 'react-router-dom'
import { config } from '../config'
import { fmtINR } from '../lib/format'
import { loadLastOrder } from '../lib/order'
import { usePageMeta } from '../lib/usePageMeta'

export function OrderConfirmed() {
  usePageMeta('Order placed', 'Your Doorswala order has been placed.')
  const order = loadLastOrder()

  if (!order) {
    return (
      <div className="page-pad confirmed">
        <h1 className="page-title">No recent order</h1>
        <p>We couldn’t find a recent order on this device.</p>
        <Link to="/shop" className="btn btn--dark">
          Browse doors
        </Link>
      </div>
    )
  }

  return (
    <div className="page-pad confirmed">
      <div className="confirmed__mark" aria-hidden="true">
        <span className="diamond" />
      </div>
      <div className="kicker">Order placed</div>
      <h1 className="page-title">
        Thank you, {order.customer.name.split(' ')[0]}.
      </h1>
      <p className="confirmed__sub">
        Your order <strong>{order.id}</strong> was prepared as a WhatsApp message. If WhatsApp didn’t open,{' '}
        <a href={order.waUrl} target="_blank" rel="noreferrer">
          tap here to send it
        </a>
        {' '}— the order isn’t received until the message is sent.
      </p>

      <div className="confirmed__card">
        {order.lines.map((l) => (
          <div key={`${l.name}${l.sizeLabel}${l.toneName}`} className="checkout__line">
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
        <div className="checkout__row checkout__row--total">
          <span>Subtotal</span>
          <span>{fmtINR(order.subtotal)}</span>
        </div>
      </div>

      <div className="confirmed__next">
        <h2>What happens next</h2>
        <ol>
          <li>We call {order.customer.phone} within 24 hours to confirm your measurement visit ({order.customer.slot.toLowerCase()}).</li>
          <li>Our fitter measures your frame to the millimetre — free, no obligation.</li>
          <li>You confirm the final size and pay 50% to start production. The balance is due only after installation.</li>
        </ol>
        <p className="confirmed__contact">
          Questions? <a href={order.waUrl} target="_blank" rel="noreferrer">WhatsApp us</a> or write to{' '}
          <a href={`mailto:${config.email}`}>{config.email}</a>.
        </p>
      </div>

      <Link to="/" className="linkline">
        ← Back to home
      </Link>
    </div>
  )
}
