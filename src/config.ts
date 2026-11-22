/**
 * ── Patidar Doors site configuration ──────────────────────────────────────
 * Everything business-specific lives here. Change a value once and the whole
 * site (checkout, footer, WhatsApp button, policies, visit page) picks it up.
 */

export const config = {
  brand: 'Patidar Doors',
  parentBrand: 'Patidar Timbers',
  tagline: 'Timber, doors, ply & WPC — from our yard to your home',

  /** Digits only, with country code, no “+” — used to build wa.me links. */
  whatsappNumber: '919611953838',

  /** Shown in the footer / contact sections. */
  phoneDisplay: '+91 96119 53838',

  /** Dial string for `tel:` links — no spaces, keeps the “+” country code. */
  phoneTel: '+919611953838',

  email: 'patidartimber.pt@gmail.com',

  storeAddress:
    'No 382, Opp IKEA & Nagsandra Metro Station, Opp Flyover Pillar No 115, Corner Site of Vikas Nagar 1st Cross Entrance, National Highway 4, Tumkur Road, Nagasandra, Bengaluru, Karnataka 560073',

  mapsUrl: 'https://share.google/0ZGoQQAgdRaHQDSNI',

  hours: 'Mon–Sat, 9am–7pm IST',
  city: 'Bengaluru',

  /** Standard leaf the base prices refer to. */
  baseSizeLabel: '8′ × 3′',

  /**
   * Where measurement, delivery and installation are handled by our own crews.
   * Outside it we supply material on enquiry, without fitting — so any copy
   * promising a visit or an install has to name this city.
   */
  serviceCity: 'Bengaluru',
} as const

/*
 * ── Removed: `warrantyYears: 10` ───────────────────────────────────────────
 * A warranty exists, but the client has not confirmed its length or coverage,
 * and the 10-year terms this site used to print were wrong (PRODUCT.md
 * § "Capabilities and Constraints"). Rather than keep a number that reads as
 * confirmed, the site now says a warranty is included and defers the specifics
 * to the written warranty issued with the invoice.
 *
 * When the real terms arrive, put them back in these four places:
 *   · pages/Policies.tsx      — the "Warranty" section
 *   · data/content.ts         — the "Is there a warranty?" FAQ
 *   · components/Footer.tsx   — the footer bar
 *   · pages/Product.tsx       — the PDP spec list
 * Add the duration here as `warrantyYears` again so those four read one value.
 */

/** wa.me deep link with a pre-filled message. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`
}
