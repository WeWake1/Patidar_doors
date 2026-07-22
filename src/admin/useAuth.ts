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
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
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
