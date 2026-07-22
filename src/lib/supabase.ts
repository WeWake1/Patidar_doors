import { createClient } from '@supabase/supabase-js'

/**
 * Browser Supabase client for the /admin app (auth + catalogue writes).
 * The public site itself is static and reads the catalogue from the
 * build-time snapshot (catalog.gen.ts), not from here.
 *
 * The URL + publishable key are safe to ship in the client bundle; row-level
 * security is what actually protects writes (only authenticated staff).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url!, anonKey!) : null
