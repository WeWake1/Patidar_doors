import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { t } from '../lib/i18n'
import { isSupabaseConfigured } from '../lib/supabase'
import './admin.css'
import { Catalogue } from './Catalogue'
import { Login } from './Login'
import { PriceBookPage } from './PriceBookPage'
import { ProductEditor } from './ProductEditor'
import { useAuth } from './useAuth'

/**
 * The client's admin, lazy-loaded under /admin so supabase-js and the cropper
 * never touch the public bundle. Gated by Supabase auth.
 *
 * Two pages and an editor: the catalogue (worlds → sections → products), the
 * price book (the numbers every door shares), and one product. The bar at
 * the top is the whole navigation — it is the same on a phone, where the
 * owner does half of this.
 */
export default function AdminApp() {
  const { session, loading, signIn, signOut } = useAuth()

  if (!isSupabaseConfigured) {
    return <div className="ax-pad">{t('ax.notConfigured')}</div>
  }
  if (loading) return <div className="ax-pad">{t('ax.loading')}</div>
  if (!session) return <Login onSignIn={signIn} />

  return (
    <div className="ax">
      <header className="ax-bar">
        <Link to="/admin" className="ax-bar__brand">
          <img src="/images/logo/patidar-mark.png" alt="" width={17} height={24} />
          <span className="ax-bar__word">Patidar Doors</span>
          <span className="ax-bar__sub">Admin</span>
        </Link>
        <nav className="ax-bar__nav" aria-label="Admin">
          <NavLink to="/admin" end className={({ isActive }) => `ax-bar__link${isActive ? ' is-on' : ''}`}>
            Catalogue
          </NavLink>
          <NavLink to="/admin/pricing" className={({ isActive }) => `ax-bar__link${isActive ? ' is-on' : ''}`}>
            Price book
          </NavLink>
          <a className="ax-bar__link ax-bar__link--ext" href="/" target="_blank" rel="noopener">
            View site ↗
          </a>
        </nav>
        <button type="button" className="ax-btn ax-btn--sm ax-btn--quiet ax-bar__out" onClick={signOut}>
          Sign out
        </button>
      </header>
      <Routes>
        <Route path="" element={<Catalogue />} />
        <Route path="pricing" element={<PriceBookPage />} />
        <Route path="product/new" element={<ProductEditor />} />
        <Route path="product/:id" element={<ProductEditor />} />
        {/* Without this a typo under /admin rendered an empty <div className="ax">
            — a blank white page inside a signed-in session, which reads as the
            admin being broken rather than as a wrong address. */}
        <Route
          path="*"
          element={
            <div className="ax-page">
              <div className="ax-state">
                <p>{t('ax.notFound')}</p>
                <Link to="/admin" className="ax-btn ax-btn--primary">
                  {t('ax.backToCatalogue')}
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  )
}
