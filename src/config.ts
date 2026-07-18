/**
 * ── Patidar Doors site configuration ──────────────────────────────────────
 * Everything business-specific lives here. Change a value once and the whole
 * site (checkout, footer, WhatsApp button, policies, visit page) picks it up.
 *
 * ⚠️ PLACEHOLDERS: replace `whatsappNumber`, `phoneDisplay`, `email`,
 * `storeAddress` and `mapsUrl` with the real business details before go-live.
 */

export const config = {
  brand: 'Patidar Doors',
  parentBrand: 'Patidar Timbers',
  tagline: 'Timber, doors, ply & WPC — from our yard to your home',

  /** Digits only, with country code, no “+” — used to build wa.me links.
   *  PLACEHOLDER — replace with the real WhatsApp business number. */
  whatsappNumber: '919800000000',

  /** Shown in the footer / contact sections. PLACEHOLDER. */
  phoneDisplay: '+91 98xxx xxxxx',

  /** PLACEHOLDER — replace with the real inbox. */
  email: 'hello@patidardoors.in',

  /** PLACEHOLDER — replace with the real shop address. */
  storeAddress: 'Patidar Timbers, Timber Market Road, Ahmedabad, Gujarat',

  /** PLACEHOLDER — replace with the real Google Maps share link. */
  mapsUrl: 'https://maps.google.com/?q=Patidar+Timbers',

  hours: 'Mon–Sat, 9am–7pm IST',
  city: 'Ahmedabad',

  /** Standard leaf the base prices refer to. */
  baseSizeLabel: '8′ × 3′',

  warrantyYears: 10,
} as const

/** wa.me deep link with a pre-filled message. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`
}
