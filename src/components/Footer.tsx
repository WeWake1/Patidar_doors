import { Link } from 'react-router-dom'
import { config } from '../config'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <div className="footer__brand">
            <span className="diamond" aria-hidden="true" />
            <span>PATIDAR DOORS</span>
          </div>
          <p className="footer__blurb">
            By {config.parentBrand} — timber, doors, ply and WPC from our own yard and factory.
            See everything in person at our store in {config.city}.
          </p>
        </div>
        <div>
          <div className="footer__head">Doors</div>
          <div className="footer__col">
            <Link to="/shop?cat=Series">Signature series</Link>
            <Link to="/shop?cat=Laminated">Laminated doors</Link>
            <Link to="/shop?cat=WPC">WPC doors</Link>
            <Link to="/shop?cat=Safety">Safety doors</Link>
          </div>
        </div>
        <div>
          <div className="footer__head">Company</div>
          <div className="footer__col">
            <Link to="/faq">FAQ</Link>
            <Link to="/policies">Warranty & policies</Link>
            <Link to="/checkout">Checkout</Link>
          </div>
        </div>
        <div>
          <div className="footer__head">Contact</div>
          <div className="footer__col">
            <a href={`mailto:${config.email}`}>{config.email}</a>
            <span>{config.phoneDisplay}</span>
            <span>{config.hours}</span>
          </div>
        </div>
      </div>
      <div className="footer__bar">
        <span>© 2026 {config.brand}. {config.city}.</span>
        <span>Free measurement visit · {config.warrantyYears}-year warranty</span>
      </div>
    </footer>
  )
}
