/* End-to-end verification of the Patidar Doors app using system Chrome (headless). */
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

/* Read the live WhatsApp number out of the config rather than pinning a copy
   here — this assertion silently rotted once already when the placeholder was
   replaced with the real number. */
const WA_NUMBER = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8').match(
  /whatsappNumber:\s*'(\d+)'/,
)?.[1]
if (!WA_NUMBER) throw new Error('could not read config.whatsappNumber')

const BASE = process.env.BASE ?? 'http://localhost:5199'
const OUT = process.env.OUT ?? '.'
const shots = []
const errors = []
const logs = []

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

// capture wa.me URL instead of opening a popup
await page.addInitScript(() => {
  window.__waUrl = null
  const orig = window.open
  window.open = (url, ...rest) => {
    if (typeof url === 'string' && url.includes('wa.me')) {
      window.__waUrl = url
      return null
    }
    return orig.call(window, url, ...rest)
  }
})

async function shot(name, opts = {}) {
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, ...opts })
  shots.push(path)
}

/**
 * Scroll with real wheel ticks. Lenis owns wheel scrolling on the storefront,
 * and it lerps toward its own internal target — a raw window.scrollTo gets
 * dragged straight back (see src/lib/smoothScroll.ts), which leaves the portal
 * at the wrong phase and its corridor invisible.
 */
async function wheelTo(targetY) {
  for (let i = 0; i < 60; i++) {
    const delta = targetY - (await page.evaluate(() => window.scrollY))
    if (Math.abs(delta) < 12) break
    await page.mouse.wheel(0, Math.max(-1400, Math.min(1400, delta)))
    await page.waitForTimeout(90)
  }
  await page.waitForTimeout(500)
}

const step = async (label, fn) => {
  try {
    await fn()
    console.log(`OK  ${label}`)
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message.split('\n')[0]}`)
    errors.push(`${label}: ${e.message.split('\n')[0]}`)
    await shot(`FAIL-${label.replace(/\W+/g, '_')}`)
  }
}

/* ── HOME ──────────────────────────────────────────────── */
await step('home loads', async () => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero__title')
})
await shot('01-home-hero')

await step('hero photo door renders (frame + leaf)', async () => {
  await page.waitForSelector('.pdoor__unit')
  await page.waitForSelector('.pdoor__leaf img')
})

await step('hero door opens on scroll (phase A)', async () => {
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(700)
  const tf = await page.evaluate(() => getComputedStyle(document.querySelector('.pdoor__leaf')).transform)
  if (tf === 'none') throw new Error('leaf transform not applied on scroll')
})
await shot('02-home-hero-open')

await step('portal corridor appears with 4 world globes (phase C)', async () => {
  const target = await page.evaluate(() => {
    const el = document.querySelector('.portal')
    return el.offsetTop + (el.offsetHeight - window.innerHeight) * 0.95
  })
  await wheelTo(target)
  const n = await page.locator('.world-globe').count()
  if (n !== 4) throw new Error(`expected 4 world globes, got ${n}`)
  const vis = await page.evaluate(() => getComputedStyle(document.querySelector('.portal__corridor')).opacity)
  if (Number(vis) < 0.9) throw new Error(`corridor not faded in (opacity ${vis})`)
})
await shot('02b-portal-corridor')

await step('corridor globe walks into Timbers world', async () => {
  await page.locator('.world-globe--timbers').click()
  await page.waitForURL('**/timbers')
  await page.waitForSelector('[data-world="timbers"]')
  await page.goBack()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(400)
})

await step('home sections render', async () => {
  for (const sel of ['.marquee', '.props', '.featured', '.econ', '.process', '.quotes', '.faqteaser', '.cta']) {
    if (!(await page.locator(sel).count())) throw new Error(`missing ${sel}`)
  }
})
await page.locator('.featured').scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
await shot('03-home-featured')
await page.locator('.process').scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
await shot('04-home-process')

/* ── SHOP / CATALOGUE ──────────────────────────────────── */
await step('catalogue shows all 49 products', async () => {
  await page.goto(BASE + '/shop', { waitUntil: 'networkidle' })
  await page.waitForSelector('.card')
  const n = await page.locator('.card').count()
  if (n !== 49) throw new Error(`expected 49 cards, got ${n}`)
})
await page.waitForTimeout(600)
await shot('05-shop-all', { fullPage: true })

await step('world filter works', async () => {
  await page.getByRole('button', { name: 'Doors', exact: true }).click()
  await page.waitForTimeout(300)
  const n = await page.locator('.card').count()
  if (n !== 27) throw new Error(`expected 27 doors, got ${n}`)
  if (!page.url().includes('world=doors')) throw new Error('url param missing')
})

/* ── WORLD PAGES ───────────────────────────────────────── */
await step('world pages render themed sections', async () => {
  for (const w of ['timbers', 'doors', 'ply', 'wpc']) {
    await page.goto(BASE + '/' + w, { waitUntil: 'networkidle' })
    await page.waitForSelector(`[data-world="${w}"]`)
    if (!(await page.locator('.world__section .card').count())) throw new Error(`${w}: no product cards`)
  }
})
await shot('05b-world-timbers')

await step('photo doors render real images', async () => {
  await page.goto(BASE + '/doors', { waitUntil: 'networkidle' })
  // local pipeline images or Supabase storage images, depending on CMS state
  const n = await page.locator('.card img[src*="/images/doors/"], .card img[src*="supabase.co"]').count()
  if (n < 10) throw new Error(`expected ≥10 photo cards, got ${n}`)
})

await step('visit page renders', async () => {
  await page.goto(BASE + '/visit', { waitUntil: 'networkidle' })
  await page.waitForSelector('.visit__grid')
})

await step('admin route is auth-gated (never public)', async () => {
  await page.goto(BASE + '/admin', { waitUntil: 'networkidle' })
  // Without a local .env the app correctly renders "not configured" instead of
  // the login box — both are valid gated states; a dashboard here would not be.
  await page.waitForSelector('.ax-login__box, .ax-pad', { timeout: 10000 })
  if (await page.locator('.ax').count()) throw new Error('admin dashboard rendered without a session')
  if (!(await page.locator('.ax-login__box').count())) {
    console.log('   (no VITE_SUPABASE_* env — admin showed the not-configured notice)')
  }
})

/* ── PRODUCT ───────────────────────────────────────────── */
await step('legacy /door/:id redirects to /product/:id', async () => {
  await page.goto(BASE + '/door/meridian', { waitUntil: 'networkidle' })
  await page.waitForURL('**/product/meridian')
})

await step('product page + configurator pricing', async () => {
  await page.goto(BASE + '/product/meridian', { waitUntil: 'networkidle' })
  await page.waitForSelector('.pdp__price')
  const p1 = await page.locator('.pdp__price').innerText()
  if (!p1.includes('86,900')) throw new Error(`default price wrong (ebony default 84500+2400): ${p1}`)
  // switch size to 6'6" x 2'6"
  await page.locator('.cfg__size').first().click()
  const p2 = await page.locator('.pdp__price').innerText()
  if (p2 === p1) throw new Error('price did not change with size')
  // switch finish to walnut (delta 0)
  await page.locator('.cfg__tone').first().click()
  const p3 = await page.locator('.pdp__price').innerText()
  if (p3 === p2) throw new Error('price did not change with finish')
})
await shot('06-pdp-meridian')

await step('add to cart shows toast and badge', async () => {
  await page.locator('.cfg__size').nth(3).click() // back to 8x3
  await page.locator('.cfg__tone').nth(4).click() // ebony
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.waitForSelector('.toast')
  const badge = await page.locator('.nav__badge').innerText()
  if (badge !== '1') throw new Error(`badge ${badge}`)
})

await step('cart persists across reload', async () => {
  await page.reload({ waitUntil: 'networkidle' })
  const badge = await page.locator('.nav__badge').innerText()
  if (badge !== '1') throw new Error(`badge after reload ${badge}`)
})

/* second product into cart */
await step('add second product (flute, sage)', async () => {
  await page.goto(BASE + '/product/flute', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Add to cart/ }).click()
  await page.waitForSelector('.toast')
})

/* ── CART DRAWER ───────────────────────────────────────── */
await step('cart drawer opens with 2 lines', async () => {
  await page.locator('.nav__cart').click()
  await page.waitForSelector('.drawer')
  const n = await page.locator('.drawer__line').count()
  if (n !== 2) throw new Error(`lines ${n}`)
})
await shot('07-cart-drawer')

await step('qty stepper works', async () => {
  await page.locator('.qty button').nth(1).click() // + on first line
  await page.waitForTimeout(200)
  const badge = await page.locator('.nav__badge').innerText()
  if (badge !== '3') throw new Error(`badge ${badge}`)
})

await step('drawer → checkout', async () => {
  await page.getByRole('button', { name: 'Proceed to checkout' }).click()
  await page.waitForURL('**/checkout')
  await page.waitForSelector('.checkout__form')
})
await shot('08-checkout')

/* ── CHECKOUT VALIDATION + ORDER ───────────────────────── */
await step('validation blocks bad input', async () => {
  await page.getByRole('button', { name: /Place order/ }).click()
  await page.waitForSelector('.field__err')
  const n = await page.locator('.field__err').count()
  if (n < 4) throw new Error(`expected several errors, got ${n}`)
})
await shot('09-checkout-errors')

await step('valid order opens WhatsApp + confirmation', async () => {
  await page.fill('#f-name', 'Vivek Patel')
  await page.fill('#f-phone', '98765 43210')
  await page.fill('#f-address', '12, Timber Lane, Near City Mall')
  await page.fill('#f-city', 'Ahmedabad')
  await page.fill('#f-pincode', '380001')
  await page.selectOption('#f-slot', { index: 1 })
  await page.fill('#f-notes', 'Opening is 84.5 inches')
  await page.getByRole('button', { name: /Place order/ }).click()
  await page.waitForURL('**/order-confirmed')
  const wa = await page.evaluate(() => window.__waUrl)
  if (!wa) throw new Error('wa.me url not captured')
  const decoded = decodeURIComponent(wa)
  for (const frag of [`wa.me/${WA_NUMBER}`, 'NEW ORDER — PD-', 'The Meridian', 'The Flute', 'Vivek Patel', '380001', 'Preferred visit']) {
    if (!decoded.includes(frag)) throw new Error(`wa message missing: ${frag}`)
  }
  console.log('   wa.me OK:', decoded.slice(0, 120).replaceAll('\n', ' | '))
})
await shot('10-order-confirmed')

await step('cart cleared after order', async () => {
  const badge = await page.locator('.nav__badge').innerText()
  if (badge !== '0') throw new Error(`badge ${badge}`)
})

/* ── FAQ / POLICIES / 404 ──────────────────────────────── */
await step('faq accordion', async () => {
  await page.goto(BASE + '/faq', { waitUntil: 'networkidle' })
  await page.locator('.faq summary').first().click()
  await page.waitForTimeout(200)
})
await shot('11-faq')

await step('policies page', async () => {
  await page.goto(BASE + '/policies', { waitUntil: 'networkidle' })
  await page.waitForSelector('.policies section')
})

await step('404 page', async () => {
  await page.goto(BASE + '/nope', { waitUntil: 'networkidle' })
  await page.waitForSelector('.notfound__code')
})

/* ── ALL 12 DOOR DESIGNS GALLERY ───────────────────────── */
await step('shop full-page gallery (art check)', async () => {
  await page.goto(BASE + '/shop', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
})
await shot('12-shop-gallery', { fullPage: true })

/* ── MOBILE ────────────────────────────────────────────── */
await step('mobile home + burger menu', async () => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot('13-mobile-home')
  await page.locator('.nav__burger').click()
  await page.waitForSelector('.nav__menu')
  await shot('14-mobile-menu')
})

await step('mobile shop + pdp', async () => {
  await page.goto(BASE + '/product/haveli', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot('15-mobile-pdp')
})

/* ── report ────────────────────────────────────────────── */
console.log('\n──── console noise ────')
console.log(logs.length ? logs.slice(0, 20).join('\n') : '(none)')
console.log('\n──── result ────')
console.log(errors.length ? `FAILURES:\n${errors.join('\n')}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(errors.length ? 1 : 0)
