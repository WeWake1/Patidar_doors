import { useState } from 'react'
import { t } from '../lib/i18n'
import { humanError } from './api'

export function Login({ onSignIn }: { onSignIn: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      await onSignIn(email, password)
    } catch (e) {
      // "Invalid login credentials" is Supabase's phrasing, not something to
      // hand a store owner who has just mistyped their password on a phone.
      setErr(humanError(e))
      setBusy(false)
    }
  }

  return (
    <div className="ax-login">
      <form className="ax-login__box" onSubmit={submit}>
        <img className="ax-login__mark" src="/images/logo/patidar-mark.png" alt="" width={28} height={40} />
        <div className="ax-login__brand">Patidar Doors</div>
        <h1 className="ax-title">Admin sign in</h1>
        {err && (
          <div className="ax-note ax-note--fault" role="alert">
            {err}
          </div>
        )}
        <label className="ax-field">
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="ax-field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="ax-btn ax-btn--primary ax-btn--block" disabled={busy}>
          {busy ? t('ax.signingIn') : t('ax.signIn')}
        </button>
      </form>
    </div>
  )
}
