import { Link } from 'react-router-dom'
import { config } from '../config'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <div className="footer__brand">
            <img className="footer__mark" src="/images/logo/patidar-mark-cream.png" alt="" aria-hidden="true" width="30" height="27" />
            <span>PATIDAR DOORS</span>
          </div>
          <p className="footer__blurb">
            By {config.parentBrand} — timber, doors, ply and WPC from our own yard and factory.
            See everything in person at our store in {config.city}.
          </p>
        </div>
        <div>
          <div className="footer__head">Ranges</div>
          <div className="footer__col">
            <Link to="/timbers">Timbers</Link>
            <Link to="/doors">Doors</Link>
            <Link to="/ply">Ply</Link>
            <Link to="/wpc">WPC</Link>
          </div>
        </div>
        <div>
          <div className="footer__head">Company</div>
          <div className="footer__col">
            <Link to="/visit">Visit the store</Link>
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
