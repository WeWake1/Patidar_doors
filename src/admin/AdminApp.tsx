import { Route, Routes } from 'react-router-dom'
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
    return <div className="ax-pad">Admin is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>
  }
  if (loading) return <div className="ax-pad">Loading…</div>
  if (!session) return <Login onSignIn={signIn} />

  return (
    <div className="ax">
      <Routes>
        <Route path="" element={<Dashboard onSignOut={signOut} />} />
        <Route path="product/new" element={<ProductEditor />} />
        <Route path="product/:id" element={<ProductEditor />} />
      </Routes>
    </div>
  )
}
