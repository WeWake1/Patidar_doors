import { Link, Route, Routes } from 'react-router-dom'
import { t } from '../lib/i18n'
import { isSupabaseConfigured } from '../lib/supabase'
import './admin.css'
import { Dashboard } from './Dashboard'
import { Login } from './Login'
import { ProductEditor } from './ProductEditor'
import { useAuth } from './useAuth'

/**
 * The client's admin dashboard, lazy-loaded under /admin so supabase-js and the
 * cropper never touch the public bundle. Gated by Supabase auth.
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
      <Routes>
        <Route path="" element={<Dashboard onSignOut={signOut} />} />
        <Route path="product/new" element={<ProductEditor />} />
        <Route path="product/:id" element={<ProductEditor />} />
        {/* Without this a typo under /admin rendered an empty <div className="ax">
            — a blank white page inside a signed-in session, which reads as the
            admin being broken rather than as a wrong address. */}
        <Route
          path="*"
          element={
            <div className="ax-pad ax-state">
              <p>{t('ax.notFound')}</p>
              <Link to="/admin" className="ax-btn ax-btn--primary">
                {t('ax.backToCatalogue')}
              </Link>
            </div>
          }
        />
      </Routes>
    </div>
  )
}
