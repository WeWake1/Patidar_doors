import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** Current Supabase auth session (null = signed out, undefined = still loading). */
export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      return
    }
    // A rejected getSession (offline, Supabase unreachable, a corrupt token in
    // localStorage) left `session` at undefined, which this hook reports as
    // `loading` — so the admin sat on "Loading…" with no way forward. Failing
    // to read a session is the same outcome as not having one: show the form.
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return {
    session,
    loading: session === undefined,
    async signIn(email: string, password: string) {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signOut() {
      await supabase?.auth.signOut()
    },
  }
}
