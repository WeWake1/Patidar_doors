/**
 * ── Doorswala site configuration ──────────────────────────────────────────
 * Everything business-specific lives here. Change a value once and the whole
 * site (checkout, footer, WhatsApp button, policies) picks it up.
 *
 * ⚠️ PLACEHOLDERS: replace `whatsappNumber`, `phoneDisplay` and `email`
 * with the real business details before going live.
 */

export const config = {
  brand: 'Doorswala',
  tagline: 'Premium doors, factory direct',

  /** Digits only, with country code, no “+” — used to build wa.me links.
   *  PLACEHOLDER — replace with the real WhatsApp business number. */
  whatsappNumber: '919800000000',

  /** Shown in the footer / contact sections. PLACEHOLDER. */
  phoneDisplay: '+91 98xxx xxxxx',

  /** PLACEHOLDER — replace with the real inbox. */
  email: 'hello@doorswala.in',

  hours: 'Mon–Sat, 9am–7pm IST',
  city: 'Made in India',

  /** Standard leaf the base prices refer to. */
  baseSizeLabel: '8′ × 3′',

  warrantyYears: 10,
} as const

/** wa.me deep link with a pre-filled message. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`
}
