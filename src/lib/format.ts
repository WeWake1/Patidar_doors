import { intlLocale } from './i18n'

/**
 * Indian grouping (1,23,456) with no paise, via Intl rather than
 * `toLocaleString()` with a hardcoded tag — so a Kannada or Hindi build groups
 * and marks currency the way that locale does. `maximumFractionDigits: 0` is
 * what keeps the output identical to the string this site has always printed.
 *
 * `Intl.NumberFormat` is constructed per call on purpose: locale can change,
 * and these run a few dozen times a page, not a few thousand.
 */
export function fmtINR(n: number): string {
  return format(n, intlLocale())
}

/**
 * The same amount for the **WhatsApp order message**, always in `en-IN`.
 * The workshop reads that message to cut the door; it must not arrive in a
 * script or a grouping the workshop doesn't read, whatever the customer was
 * browsing in.
 */
export function fmtINROrder(n: number): string {
  return format(n, 'en-IN')
}

function format(n: number, tag: string): string {
  // A NaN or Infinity here means a price computation went wrong upstream.
  // Printing "₹NaN" next to an Add-to-cart button is worse than printing
  // nothing, so it degrades to a dash and the caller's layout still holds.
  if (!Number.isFinite(n)) return '—'
  try {
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    // Unknown locale tag on an old engine — fall back rather than throw.
    return '₹' + Math.round(n).toLocaleString('en-IN')
  }
}

/** Human-friendly order reference, e.g. PD-4K7QZ2 */
export function makeOrderId(): string {
  const t = Date.now().toString(36).slice(-4).toUpperCase()
  const r = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `PD-${t}${r}`
}
