import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useCart } from '../cart/CartContext'
import { config } from '../config'
import { useScrollLock } from '../lib/useScrollLock'

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
  const barRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  // The bar's height moves with the breakpoint and with the notch inset, and
  // the menu sheet has to sit exactly beneath it — publish the measurement
  // instead of hard-coding it in three places in the stylesheet.
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      // offsetHeight, not contentRect — the bar's padding is part of its height
      document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useScrollLock(menuOpen)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <>
      <nav className="nav" ref={barRef}>
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
            <svg
              className="nav__cart-icon"
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 8h12l-1 11.2a1.6 1.6 0 0 1-1.6 1.4H8.6A1.6 1.6 0 0 1 7 19.2L6 8Z" />
              <path d="M9 8.5V6a3 3 0 0 1 6 0v2.5" />
            </svg>
            <span className="nav__cart-label">Cart</span>
            <span className="nav__badge">{count}</span>
          </button>
          <button
            type="button"
            className={`nav__burger${menuOpen ? ' nav__burger--open' : ''}`}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <>
          <div className="nav__scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="nav__menu" id="nav-menu">
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
            {/* the store is the product — put calling it one thumb away */}
            <a className="nav__menu-call" href={`tel:${config.phoneTel}`}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M6.3 3.5h3l1.5 3.8-2 1.4a12 12 0 0 0 5.5 5.5l1.4-2 3.8 1.5v3a1.8 1.8 0 0 1-2 1.8A16.2 16.2 0 0 1 4.5 5.5a1.8 1.8 0 0 1 1.8-2Z" />
              </svg>
              Call {config.phoneDisplay}
            </a>
          </div>
        </>
      )}
    </>
  )
}
