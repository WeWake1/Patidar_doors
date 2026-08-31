import { useEffect } from 'react'
import { CMS_ORDER, CMS_SELECT, mapCatalogue, type CmsProductRow } from './cmsMap'
import { publishCatalogue, setCatalogueStatus } from './products'

/**
 * Re-read the published catalogue from Supabase in the browser.
 *
 * ── why this exists ───────────────────────────────────────────────────────
 * The storefront was a build-time snapshot only: /admin wrote to Supabase, and
 * the rows reached the site through `npm run catalog:fetch` → rebuild →
 * redeploy. That last hop was documented as a Supabase→Vercel deploy hook and
 * never wired up, so from the client's side the admin simply did not work —
 * they added doors and a whole new section, and the site went on showing the
 * catalogue as of the last deploy. This closes the loop from the other end: if
 * the rebuild never happens, the site still tells the truth.
 *
 * ── what it costs ─────────────────────────────────────────────────────────
 * One `fetch` of the whole published catalogue — 5.7 kB gzipped for 40
 * products, no library (the Supabase client is ~30 kB and stays in the admin
 * bundle; this is PostgREST over plain HTTP with the publishable key the page
 * already ships). It runs from an effect, so it starts after the first paint
 * and nothing on the page waits for it: the snapshot renders immediately and
 * is replaced only if the CMS says something different.
 *
 * ── what it never does ────────────────────────────────────────────────────
 * Fail loudly. A refused, blocked or offline read leaves the built-in
 * catalogue exactly where it is — the site is a showcase whose job is footfall
 * to a shop, and it must keep listing doors and handing over an address when
 * the network does not cooperate.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Don't re-read more than this often, however many times focus bounces. */
const MIN_INTERVAL_MS = 60_000

let inFlight: Promise<void> | null = null
let lastAt = 0

async function read(): Promise<void> {
  const query =
    `${URL_BASE}/rest/v1/products` +
    `?select=${encodeURIComponent(CMS_SELECT)}` +
    `&published=eq.true&order=${CMS_ORDER}`
  const res = await fetch(query, {
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY!}` },
    // The catalogue changes when the client saves, not when a CDN decides.
    cache: 'no-cache',
  })
  if (!res.ok) throw new Error(`catalogue read failed: ${res.status}`)
  const rows = (await res.json()) as CmsProductRow[]
  if (!Array.isArray(rows)) throw new Error('catalogue read returned a non-list')
  /* An empty list is not an answer we act on. Every id the site sells also
     exists locally, so a wiped or mis-permissioned table would otherwise blank
     the shop — and "the CMS returned nothing" is indistinguishable from "the
     client deleted everything", which is not a call this function gets to
     make. The snapshot stands. */
  if (rows.length === 0) throw new Error('catalogue read returned no products')
  const { products, sections } = mapCatalogue(rows)
  publishCatalogue(products, sections)
}

/**
 * Refresh the catalogue, at most once a minute. Resolves when the read is
 * done, whether or not it worked — callers never have to handle a rejection.
 */
export function refreshCatalogue(force = false): Promise<void> {
  if (!URL_BASE || !KEY || typeof fetch !== 'function') return Promise.resolve()
  if (inFlight) return inFlight
  if (!force && lastAt && Date.now() - lastAt < MIN_INTERVAL_MS) return Promise.resolve()
  setCatalogueStatus('loading')
  inFlight = read()
    .catch((e) => {
      setCatalogueStatus('error')
      if (import.meta.env.DEV) console.warn('[catalogue] live read failed, using the built-in copy', e)
    })
    .finally(() => {
      lastAt = Date.now()
      inFlight = null
    })
  return inFlight
}

/**
 * Mounted once, at the root of the storefront: read the catalogue on load, and
 * again when the tab comes back — the shop owner adds a door in one tab and
 * checks the site in another, and that is exactly the moment this has to be
 * right.
 */
export function useLiveCatalogue(): void {
  useEffect(() => {
    refreshCatalogue()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCatalogue()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}
