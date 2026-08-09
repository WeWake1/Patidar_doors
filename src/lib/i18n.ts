/**
 * ── Translation seam ──────────────────────────────────────────────────────
 *
 * The site ships **English only**. This module exists so that adding Kannada
 * or Hindi — the two scripts this store's customers actually read — is a
 * catalogue file and a `<html lang>` flip, not a sweep through every
 * component. Nothing here translates anything today; `t()` returns the English
 * string for every locale until a catalogue is filled in.
 *
 * Scope, deliberately: **functional** copy is keyed here — controls, labels,
 * errors, empty states, confirmations, the admin chrome. Editorial copy (the
 * home page's prose, `data/content.ts`, product stories) is *not*, because
 * that is written by the client and belongs with the catalogue in the CMS, not
 * in a UI string table. When a second language ships, editorial copy comes
 * from Supabase per-locale; this table covers the shell around it.
 *
 * `t()` is a plain function, not a hook, so a component reads
 * `t('cart.title')` inline without ceremony. That is safe precisely because
 * only one locale ships: nothing can change the locale mid-session. The day a
 * second catalogue lands, wrap the app in a provider and re-export `t` from a
 * `useT()` hook — the call sites do not change.
 */

export type Locale = 'en' | 'kn' | 'hi'

const LOCALES: readonly Locale[] = ['en', 'kn', 'hi']

/**
 * Every string is keyed `surface.thing`. Keep them sorted by surface — the
 * order in this file is the order a translator will work through it.
 */
const en = {
  // ── site chrome ───────────────────────────────────────────────────────
  'nav.skip': 'Skip to main content',
  'nav.home': 'Patidar Doors home',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'nav.policies': 'Warranty & policies',
  'nav.call': 'Call {phone}',
  'nav.cart': 'Cart',
  'nav.cartOpen': 'Open cart, {count} items',

  // ── cart drawer ───────────────────────────────────────────────────────
  'cart.title': 'Your cart',
  'cart.close': 'Close cart',
  'cart.empty.title': 'Your cart is empty',
  'cart.empty.body':
    'Designer Studio doors are priced and ordered here. Everything else in the catalogue — timber, ply, WPC and our other door ranges — is quoted in the store or on WhatsApp.',
  'cart.browse': 'Browse the catalogue',
  'cart.each': '{price} each',
  'cart.decrease': 'Decrease quantity of {name}',
  'cart.increase': 'Increase quantity of {name}',
  'cart.maxQty': "That's the most we take in one order — call us for a bulk quote.",
  'cart.remove': 'Remove',
  'cart.included': 'Measurement visit & installation',
  'cart.includedValue': 'Included',
  'cart.subtotal': 'Subtotal',
  'cart.checkout': 'Proceed to checkout',
  'cart.note': 'Pay after the measurement visit · Cancel anytime before production',

  // ── checkout ──────────────────────────────────────────────────────────
  'checkout.title': 'Checkout',
  'checkout.empty': 'Your cart is empty — every great room starts at the door.',
  'checkout.h.details': 'Delivery details',
  'checkout.h.doors': 'Your doors',
  'checkout.f.name': 'Full name',
  'checkout.f.phone': 'Mobile number',
  'checkout.f.phoneHint': '10 digits, no country code. We call this number to schedule the visit.',
  'checkout.f.email': 'Email (optional)',
  'checkout.f.address': 'Address',
  'checkout.f.addressPlaceholder': 'Flat / house, building, street, landmark',
  'checkout.f.city': 'City',
  'checkout.f.pincode': 'Pincode',
  'checkout.f.slot': 'Preferred visit time',
  'checkout.f.notes': 'Notes (optional)',
  'checkout.f.notesPlaceholder': 'Exact opening size, floor number, anything we should know',
  'checkout.submit': 'Open WhatsApp with my order',
  'checkout.submitting': 'Opening WhatsApp…',
  'checkout.errorSummary': '{count} details need fixing before we can write your order.',
  'checkout.e.name': 'Please enter your full name.',
  'checkout.e.nameLong': 'That name is too long for the order message — please shorten it.',
  'checkout.e.phone': 'Enter a valid 10-digit Indian mobile number.',
  'checkout.e.email': 'That email doesn’t look right.',
  'checkout.e.address': 'Please enter your full address.',
  'checkout.e.addressLong': 'That address is too long for the order message — please shorten it.',
  'checkout.e.city': 'Please enter your city.',
  'checkout.e.pincode': 'Enter your 6-digit pincode.',
  'checkout.e.notesLong': 'Notes are limited to {max} characters so the order message reaches us intact.',
  'checkout.e.tooLong':
    'The order message is longer than WhatsApp accepts. Shorten your notes or address, or send us fewer doors in one go.',
  'checkout.blocked':
    'Your browser blocked the WhatsApp window. Your order is saved — open the message from the button below.',
  'checkout.charsLeft': '{n} characters left',

  // ── order confirmed ───────────────────────────────────────────────────
  'confirmed.none.title': 'Nothing to send.',
  'confirmed.send': 'Send it, {firstName}.',
  'confirmed.sendNoName': 'Send it.',
  'confirmed.openAgain': 'open the message again',

  // ── catalogue / empty states ──────────────────────────────────────────
  'shop.filterAll': 'All',
  'shop.filterLabel': 'Filter by range',
  'shop.noneInRange': 'Nothing in this range yet.',
  'shop.noneInRangeBody':
    'We stock more than is photographed. Ask us what’s on the floor today, or see the whole catalogue.',
  'shop.showAll': 'Show the whole catalogue',
  'world.empty': 'This range is being re-photographed.',
  'world.emptyBody':
    'Everything in it is still on the floor at the store — message us and we’ll send photos and prices of what’s in stock.',
  'photo.unavailable': 'Photo coming soon',

  // ── errors ────────────────────────────────────────────────────────────
  'error.title': 'Something came off its hinges.',
  'error.body':
    'This page hit an error we didn’t plan for. Nothing you’ve done is lost — your cart is still saved on this device.',
  'error.stale.title': 'The site updated while you were reading.',
  'error.stale.body': 'A newer version is live. Reload to pick it up — it takes a second.',
  'error.reload': 'Reload the page',
  'error.home': 'Back to home',
  'error.callUs': 'Or call the store: {phone}',
  'error.detail': 'Technical detail',

  // ── admin ─────────────────────────────────────────────────────────────
  'ax.loading': 'Loading…',
  'ax.retry': 'Try again',
  'ax.offline': 'You appear to be offline. Check the connection and try again.',
  'ax.notConfigured': 'Admin is not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  'ax.notFound': 'That admin page doesn’t exist.',
  'ax.backToCatalogue': 'Back to the catalogue',
  'ax.signIn': 'Sign in',
  'ax.signingIn': 'Signing in…',
  'ax.badCredentials': 'That email and password don’t match an account.',
  'ax.notAllowed': 'You’re signed in, but this account isn’t on the admin list. Ask for access.',
  'ax.sessionExpired': 'Your session expired. Sign in again.',
  'ax.duplicateSlug': 'Another product already uses that web address. Change the name slightly.',
  'ax.stillReferenced': 'Something still points at this. Remove it from there first.',
  'ax.saveFailed': 'Couldn’t save. {detail}',
  'ax.deleteFailed': 'Couldn’t delete “{name}”. {detail}',
  'ax.renameFailed': 'Couldn’t rename “{name}”. {detail}',
  'ax.loadFailed': 'Couldn’t load the catalogue. {detail}',
  'ax.unsaved': 'You have unsaved changes. Leave without saving?',
  'ax.orphans': 'Not in any section',
  'ax.orphansNote':
    'These products have no section, so they don’t appear on the site. Edit each one and give it a section.',
  'ax.img.tooBig': 'That photo is {size} — the limit is {max}. Take a smaller one or resize it first.',
  'ax.img.wrongType': 'That’s not an image file.',
  'ax.img.unreadable':
    'This browser can’t open that photo. iPhone HEIC files often do this — re-save it as JPEG and try again.',
  'ax.img.encodeFailed': 'Couldn’t process that photo. Try a different one.',
  'ax.img.uploading': 'Uploading {step} of {total}…',
} as const

export type StringKey = keyof typeof en

/**
 * A catalogue may be partial. Any key it is missing falls back to English, so
 * a half-translated site is never a half-blank site.
 */
type Catalogue = Partial<Record<StringKey, string>>

const catalogues: Record<Locale, Catalogue> = {
  en,
  kn: {}, // ಕನ್ನಡ — not translated yet
  hi: {}, // हिन्दी — not translated yet
}

function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v)
}

/** The active locale, read once from `<html lang>` — see the note at the top. */
let locale: Locale = (() => {
  if (typeof document === 'undefined') return 'en'
  const tag = document.documentElement.lang.slice(0, 2).toLowerCase()
  return isLocale(tag) ? tag : 'en'
})()

export function getLocale(): Locale {
  return locale
}

/**
 * Switch language. Sets `<html lang>` too — the stylesheet keys its script
 * rules off that attribute, so the type behaves before a single string has
 * been translated.
 */
export function setLocale(next: Locale) {
  locale = next
  if (typeof document !== 'undefined') document.documentElement.lang = next
}

/** The BCP-47 tag for `Intl`. India for all three — this is one store. */
export function intlLocale(): string {
  return `${locale}-IN`
}

/**
 * Look up a string, filling `{placeholders}` from `vars`.
 *
 * Placeholders are named, never positional, because word order is exactly what
 * a translation changes: "{count} items in {name}" has to be free to become
 * "{name} — {count}".
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const s = catalogues[locale][key] ?? en[key]
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  )
}
