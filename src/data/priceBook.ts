import { useSyncExternalStore } from 'react'
import { CMS_PRICE_BOOK } from './catalog.gen'
import type { PriceBook } from './pricing'
import { parsePriceBook } from './pricing'

/**
 * The shop-wide price book the storefront quotes with — the same store shape
 * as the catalogue in products.ts, for the same reason: it is edited in
 * /admin and re-read live in the browser (`liveCatalog.ts`), with the copy
 * `catalog:fetch` baked into the bundle painting first and standing in when
 * the read fails. `DEFAULT_PRICE_BOOK` (via `parsePriceBook(null)`) is the
 * last fallback, so a site with no CMS at all still quotes.
 */

let BOOK: PriceBook = parsePriceBook(CMS_PRICE_BOOK)
const listeners = new Set<() => void>()

export function subscribePriceBook(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getPriceBook(): PriceBook {
  return BOOK
}

/** Called by `liveCatalog.ts` with whatever the settings row holds. */
export function publishPriceBook(raw: unknown) {
  BOOK = parsePriceBook(raw)
  for (const fn of listeners) fn()
}

/** The price book, re-rendering when the live one lands. */
export function usePriceBook(): PriceBook {
  return useSyncExternalStore(subscribePriceBook, getPriceBook, getPriceBook)
}
