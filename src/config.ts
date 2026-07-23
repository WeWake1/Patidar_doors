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

  email: 'patidartimber.pt@gmail.com',

  storeAddress:
    'No 382, Opp IKEA & Nagsandra Metro Station, Opp Flyover Pillar No 115, Corner Site of Vikas Nagar 1st Cross Entrance, National Highway 4, Tumkur Road, Nagasandra, Bengaluru, Karnataka 560073',

  mapsUrl: 'https://share.google/0ZGoQQAgdRaHQDSNI',

  hours: 'Mon–Sat, 9am–7pm IST',
  city: 'Bengaluru',

  /** Standard leaf the base prices refer to. */
  baseSizeLabel: '8′ × 3′',

  warrantyYears: 10,
} as const

/** wa.me deep link with a pre-filled message. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`
}
