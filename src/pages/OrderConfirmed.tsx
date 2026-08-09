import { Link } from 'react-router-dom'
import { config } from '../config'
import { fmtINR } from '../lib/format'
import { t } from '../lib/i18n'
import { loadLastOrder } from '../lib/order'
import { usePageMeta } from '../lib/usePageMeta'

/**
 * The page after checkout. It deliberately does *not* say "order placed": the
 * site hands the order to WhatsApp and the customer sends it, so we cannot know
 * that it arrived. Claiming success here and then admitting the truth in the
 * small print — which is what this page used to do — is the worst of both.
 */
export function OrderConfirmed() {
  usePageMeta('Send your order', 'Your Patidar Doors order is ready to send on WhatsApp.')
  const order = loadLastOrder()

  if (!order) {
    return (
      <div className="page-pad confirmed">
        <h1 className="page-title">{t('confirmed.none.title')}</h1>
        <p>
          There’s no recent order saved on this device — it may have been placed on another phone, or the browser may
          have cleared it. If you already sent us a WhatsApp message, we have it; nothing is lost.
        </p>
        <Link to="/shop" className="btn btn--dark">
          {t('cart.browse')}
        </Link>
      </div>
    )
  }

  // A name is validated at checkout, but this order came out of localStorage
  // and may predate that or have been written by an older build.
  const firstName = order.customer.name.trim().split(/\s+/)[0] ?? ''

  return (
    <div className="page-pad confirmed">
      <div className="confirmed__mark" aria-hidden="true">
        <span className="diamond" />
      </div>
      <div className="kicker">One step left</div>
      <h1 className="page-title">
        {firstName ? t('confirmed.send', { firstName }) : t('confirmed.sendNoName')}
      </h1>

      {/* A refused pop-up is the one path where the customer never saw
          WhatsApp at all and has no reason to suspect it. That case leads with
          the button; everyone else gets the receipt first and the link as a
          safety net inside the sentence. */}
      {order.blocked ? (
        <>
          <p className="confirmed__sub">{t('checkout.blocked')}</p>
          <a className="btn btn--dark btn--big confirmed__open" href={order.waUrl} target="_blank" rel="noreferrer">
            Open WhatsApp with order {order.id}
          </a>
        </>
      ) : (
        <p className="confirmed__sub">
          Order <strong>{order.id}</strong> is written and waiting in WhatsApp. We only have it once you hit send — so
          if WhatsApp didn’t open, or you closed it,{' '}
          <a href={order.waUrl} target="_blank" rel="noreferrer">
            {t('confirmed.openAgain')}
          </a>
          .
        </p>
      )}

      <div className="confirmed__card">
        {/* Indexed, not composed from the fields — two lines of the same door
            in different quantities produce an identical composite key. */}
        {order.lines.map((l, i) => (
          <div key={i} className="checkout__line">
            <div>
              <div className="checkout__line-name">
                {l.qty} × {l.name}
              </div>
              <div className="checkout__line-meta">
                {l.sizeLabel} · {l.toneName}
              </div>
              {l.optsLabel && <div className="checkout__line-meta">{l.optsLabel}</div>}
            </div>
            <div className="checkout__line-price">{fmtINR(l.lineTotal)}</div>
          </div>
        ))}
        <div className="checkout__row checkout__row--total">
          <span>{t('cart.subtotal')}</span>
          <span>{fmtINR(order.subtotal)}</span>
        </div>
      </div>

      <div className="confirmed__next">
        <h2>Once the message reaches us</h2>
        <ol>
          {/* Both details come from storage and an older or truncated order can
              be missing either, which used to print "We call  within 24 hours"
              and an empty pair of brackets. */}
          <li>
            We call {order.customer.phone || 'you'} within 24 hours to confirm your measurement visit
            {order.customer.slot ? ` (${order.customer.slot.toLowerCase()})` : ''}.
          </li>
          <li>Our fitter measures your frame to the millimetre — free, no obligation.</li>
          <li>You confirm the final size and pay 50% to start production. The balance is due only after installation.</li>
        </ol>
        <p className="confirmed__contact">
          Questions? <a href={order.waUrl} target="_blank" rel="noreferrer">WhatsApp us</a> or write to{' '}
          <a href={`mailto:${config.email}`}>{config.email}</a>.
        </p>
      </div>

      <Link to="/" className="linkline">
        ← {t('error.home')}
      </Link>
    </div>
  )
}
