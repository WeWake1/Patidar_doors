import { config } from '../config'
import { usePageMeta } from '../lib/usePageMeta'

export function Policies() {
  usePageMeta('Warranty & policies', 'Patidar Doors warranty terms, delivery & installation, payment and cancellation policies.')
  return (
    <div className="page-pad policies">
      <div className="kicker">The fine print, in plain words</div>
      <h1 className="page-title">Warranty & policies</h1>

      <section>
        <h2>{config.warrantyYears}-year warranty</h2>
        <p>
          Every Patidar door carries a {config.warrantyYears}-year warranty against manufacturing defects: warping
          beyond 3 mm across the leaf, delamination of the face, core defects, and failure of hardware supplied by us
          under normal domestic use.
        </p>
        <p>
          The warranty does not cover physical damage or misuse, exposure to standing water at the frame, alterations
          made by third parties, or natural variation in wood grain and colour — that variation is the point. Your
          digital warranty card is issued with the final invoice; claims are honoured with repair first, replacement
          where repair isn’t possible.
        </p>
      </section>

      <section>
        <h2>Measurement visit</h2>
        <p>
          Placing an order books a free measurement visit — it costs nothing and doesn’t commit you. Our fitter
          measures the frame, checks swing side and level, and confirms the final size and price (same per-area rate as
          the site). Production begins only after your go-ahead.
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
          Made-to-measure production takes 10–14 working days from confirmation. Delivery and installation happen in a
          single visit by our own crew — the door is hung on our hinges, aligned, sealed, and the site left clean. We
          serve customers pan-India; remote pincodes are confirmed on the scheduling call.
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
