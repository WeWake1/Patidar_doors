import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../cart/CartContext'

const links = [
  { to: '/timbers', label: 'Timbers' },
  { to: '/doors', label: 'Doors' },
  { to: '/ply', label: 'Ply' },
  { to: '/wpc', label: 'WPC' },
  { to: '/shop', label: 'Catalogue' },
  { to: '/visit', label: 'Visit' },
]

export function Nav() {
  const { count, openCart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  return (
    <>
      <nav className="nav">
        <Link to="/" className="nav__brand" aria-label="Patidar Doors home">
          <img className="nav__mark" src="/images/logo/patidar-mark.png" alt="" aria-hidden="true" width="34" height="30" />
          <span className="nav__wordmark">
            <span className="nav__word">PATIDAR DOORS</span>
            <span className="nav__sub">by Patidar Timbers</span>
          </span>
        </Link>

        <div className="nav__links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="nav__actions">
          <button type="button" className="nav__cart" onClick={openCart} aria-label={`Open cart, ${count} items`}>
            <span>Cart</span>
            <span className="nav__badge">{count}</span>
          </button>
          <button
            type="button"
            className={`nav__burger${menuOpen ? ' nav__burger--open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="nav__menu">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `nav__menu-link${isActive ? ' nav__menu-link--active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/policies" className="nav__menu-link">
            Warranty & policies
          </NavLink>
        </div>
      )}
    </>
  )
}
