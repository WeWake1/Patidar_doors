import { config } from '../config'
import { usePageMeta } from '../lib/usePageMeta'

export function Policies() {
  usePageMeta('Warranty & policies', 'Patidar Doors warranty terms, delivery & installation, payment and cancellation policies.')
  return (
    <div className="page-pad policies">
      <div className="kicker">The fine print, in plain words</div>
      <h1 className="page-title">Warranty & policies</h1>

      <section>
        <h2>Warranty</h2>
        <p>
          Every door we make is covered against manufacturing defects under normal domestic use. Ask us for the exact
          term and what it covers before you order — we would rather tell you in person than have you read it off a
          page. The written warranty is issued with your final invoice, so you have it in hand either way.
        </p>
        <p>
          What no warranty covers, here or anywhere: physical damage and misuse, standing water at the frame,
          alterations made by third parties, and natural variation in wood grain and colour — that last one is the
          point of buying real timber. Claims are settled with repair first, replacement where repair isn’t possible.
        </p>
      </section>

      <section>
        <h2>Measurement visit</h2>
        <p>
          Sending us an order books a free measurement visit anywhere in {config.serviceCity} — it costs nothing and
          doesn’t commit you. Our fitter measures the frame, checks swing side and level, and confirms the final size
          and price (same per-area rate as the site). Production begins only after your go-ahead.
        </p>
      </section>

      <section>
        <h2>Payment</h2>
        <p>
          Nothing is collected online. After you confirm measurements, 50% is collected to begin production. The
          balance is due after installation, once you’ve inspected the door. We accept UPI, bank transfer and all major
          cards.
        </p>
      </section>

      <section>
        <h2>Delivery & installation</h2>
        <p>
          Made-to-measure production takes 10–14 working days from confirmation. Across {config.serviceCity}, delivery
          and installation happen in a single visit by our own crew — the door is hung on our hinges, aligned, sealed,
          and the site left clean.
        </p>
        <p>
          Outside the city we supply the material rather than the fitting: timber, ply and finished doors can be
          freighted to you, but our crews do not travel to install them. Send us your pincode before you order and
          we’ll tell you exactly what we can and can’t do for that address.
        </p>
      </section>

      <section>
        <h2>Cancellation & refunds</h2>
        <p>
          Cancel free of charge any time before production begins — that is, up to your post-measurement confirmation.
          Because each leaf is cut to your exact opening, orders cannot be cancelled once production starts; the 50%
          production payment covers the made-to-order leaf. If we fail to deliver within 30 working days of
          confirmation, you may cancel for a full refund of everything paid.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          {config.brand} · <a href={`tel:${config.phoneTel}`}>{config.phoneDisplay}</a> ·{' '}
          <a href={`mailto:${config.email}`}>{config.email}</a> · {config.hours}
        </p>
      </section>
    </div>
  )
}
