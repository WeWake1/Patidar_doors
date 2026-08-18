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

// Capture the wa.me URL instead of opening a popup.
//
// ⚠️ This returns a stand-in *window*, not null. A real browser returns a
// window object here and only returns null when the pop-up was actually
// refused — so a stub returning null told the site every order was blocked,
// which is exactly the bug that shipped (`window.open(url, '_blank',
// 'noopener')` always returns null) and exactly what this stub then hid.
// Return null here only to test the blocked path on purpose.
await page.addInitScript(() => {
  window.__waUrl = null
  const orig = window.open
  window.open = (url, target, features, ...rest) => {
    if (typeof url === 'string' && url.includes('wa.me')) {
      window.__waUrl = url
      // Faithful to the spec, and this is the whole point of the stub: a call
      // passed `noopener` returns null even though the window opened. Without
      // this line the stub happily returns a window for the one call shape
      // that never does, and the site's own "was it blocked?" check cannot be
      // tested at all.
      if (typeof features === 'string' && /\bnoopener\b/.test(features)) return null
      return { opener: null, closed: false, close() {}, focus() {} }
    }
    return orig.call(window, url, target, features, ...rest)
  }
})

/* Record what navigator.share was handed, instead of opening a share sheet.
   Faithful to the real API in the one way that matters here: canShare() only
   accepts a descriptor carrying actual files, so the code path under test is
   the file-share branch and not the download fallback. */
await page.addInitScript(() => {
  window.__shared = null
  navigator.canShare = (d) => Array.isArray(d?.files) && d.files.length > 0
  navigator.share = async (d) => {
    const f = d.files[0]
    window.__shared = { name: f.name, type: f.type, size: f.size, text: d.text }
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

await step('portal corridor appears with 4 world cards (phase C)', async () => {
  const target = await page.evaluate(() => {
    const el = document.querySelector('.portal')
    return el.offsetTop + (el.offsetHeight - window.innerHeight) * 0.95
  })
  await wheelTo(target)
  const n = await page.locator('.wcard').count()
  if (n !== 4) throw new Error(`expected 4 world cards, got ${n}`)
  const vis = await page.evaluate(() => getComputedStyle(document.querySelector('.portal__corridor')).opacity)
  if (Number(vis) < 0.9) throw new Error(`corridor not faded in (opacity ${vis})`)
})
await shot('02b-portal-corridor')

await step('corridor card walks into Timbers world', async () => {
  await page.locator('.wcard--timbers').click()
  await page.waitForURL('**/timbers')
  await page.waitForSelector('[data-world="timbers"]')
  await page.goBack()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(400)
})

await step('home sections render', async () => {
  for (const sel of ['.marquee', '.props', '.featured', '.econ', '.process', '.terms', '.cta']) {
    if (!(await page.locator(sel).count())) throw new Error(`missing ${sel}`)
  }
  // the FAQ accordion teaser was removed from `/` 2026-08-13 — the full set
  // lives on /faq and /policies, both in the footer
  if (await page.locator('.faq').count()) throw new Error('.faq is back on the home page')
})
await page.locator('.featured').scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
await shot('03-home-featured')
await page.locator('.process').scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
await shot('04-home-process')

/* ── DOOR WALL (home) ──────────────────────────────────── */
/* The band moved off /shop on 2026-08-13 and now sits below the portal hero,
   lazy and mounted only on approach — so it cannot be reached by a fixed
   offset any more, and `.doorwall` does not exist until we get near it. Walk
   to the reserve (`.doorwall-hold`, which is in the page from the start), let
   the chunk mount, then centre the pane on what actually rendered. */
async function gotoDoorWall() {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  const reserve = await page.evaluate(() => {
    const el = document.querySelector('.doorwall, .doorwall-hold')
    if (!el) return null
    return el.getBoundingClientRect().top + window.scrollY
  })
  if (reserve === null) throw new Error('no door wall (or its reserve) on the home page')
  await wheelTo(reserve)
  await page.waitForSelector('.drift-wall__tile')
  const centre = await page.evaluate(() => {
    const r = document.querySelector('.doorwall__wall').getBoundingClientRect()
    return Math.max(0, r.top + window.scrollY + r.height / 2 - window.innerHeight / 2)
  })
  await wheelTo(centre)
  await page.waitForTimeout(700)
}

/* The wall's tiles drift continuously, so there is no stable locator to click —
   aim at the middle of the pane and let the component resolve the tile. */
async function clickDoorWall() {
  const box = await page.locator('.doorwall__wall').boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await page.waitForTimeout(500)
}

await step('home reserves the door wall band without loading it', async () => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero__title')
  // At the top of the page the band is still a viewport away: the reserve holds
  // its height, and mounting it here would put DriftWall's rAF under the hero.
  if (!(await page.locator('.doorwall-hold').count())) throw new Error('no reserve holding the door wall band')
  if (await page.locator('.drift-wall').count()) throw new Error('door wall mounted at the top of the page')
})

await step('door wall: click a tile, big viewer follows', async () => {
  await gotoDoorWall()
  const before = await page.locator('.doorwall__viewer img').getAttribute('src')
  // up to three tries: the middle of the pane can land on the one photo already
  // showing, which is a legitimate click with no visible change
  let after = before
  for (let i = 0; i < 3 && after === before; i++) {
    await clickDoorWall()
    after = await page.locator('.doorwall__viewer img').getAttribute('src')
  }
  if (after === before) throw new Error('viewer never changed photo')
  if (!(await page.locator('.drift-wall__tile.is-selected').count())) throw new Error('no tile marked selected')
})
await shot('04b-home-doorwall')

/* ── SHOP / CATALOGUE ──────────────────────────────────── */
await step('catalogue shows all 49 products', async () => {
  await page.goto(BASE + '/shop', { waitUntil: 'networkidle' })
  await page.waitForSelector('.card')
  const n = await page.locator('.card').count()
  if (n !== 49) throw new Error(`expected 49 cards, got ${n}`)
  // it moved to the home page — showing it twice would halve it
  if (await page.locator('.doorwall, .doorwall-hold').count()) throw new Error('door wall still on the catalogue')
})
await page.waitForTimeout(600)
await shot('05-shop-all', { fullPage: true })

await step('world filter works', async () => {
  await page.goto(BASE + '/shop', { waitUntil: 'networkidle' })
  await page.waitForSelector('.card')
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

/** Drag a dimension slider to an exact value and return the new price text. */
const setDim = async (which, inches) => {
  await page.locator('.dim__input').nth(which === 'height' ? 0 : 1).fill(String(inches))
  return page.locator('.pdp__price').innerText()
}

await step('product page + made-to-measure configurator', async () => {
  await page.goto(BASE + '/product/meridian', { waitUntil: 'networkidle' })
  await page.waitForSelector('.pdp__price')
  const p1 = await page.locator('.pdp__price').innerText()
  if (!p1.includes('86,900')) throw new Error(`default price wrong (8'x3' ebony 84500+2400): ${p1}`)

  const p2 = await setDim('height', 78)
  if (p2 === p1) throw new Error('price did not change with height')
  const p3 = await setDim('width', 30)
  if (p3 === p2) throw new Error('price did not change with width')

  // The panel ladder is the point: a quarter-inch that still fits the same
  // 78x30 board must not move the price, and crossing to the next one must.
  const same = await setDim('height', 77.75)
  if (same !== p3) throw new Error(`price moved inside one stock panel: ${p3} -> ${same}`)
  const next = await setDim('height', 79)
  if (next === same) throw new Error('price did not step up to the next stock panel')

  // thinner leaf is cheaper
  await page.getByRole('radio', { name: /28 mm/ }).click()
  const thin = await page.locator('.pdp__price').innerText()
  if (thin === next) throw new Error('price did not change with thickness')

  // a frame reveals its own two option groups and adds to the price
  await page.getByRole('radio', { name: /3-side frame/ }).click()
  await page.waitForSelector('.cfg--opt legend:text-is("Frame section")')
  const framed = await page.locator('.pdp__price').innerText()
  if (framed === thin) throw new Error('price did not change with the frame')

  // the breakdown must add up to the headline price
  await page.locator('.cfg__break > summary').click()
  const total = await page.locator('.cfg__break-total .cfg__break-amt').innerText()
  if (total.trim() !== framed.trim()) throw new Error(`breakdown total ${total} != headline ${framed}`)

  // switch finish to walnut (delta 0)
  await page.locator('.cfg__tone').first().click()
  const toned = await page.locator('.pdp__price').innerText()
  if (toned === framed) throw new Error('price did not change with finish')
})
await shot('06-pdp-meridian')

await step('add to cart shows toast and badge', async () => {
  // back to a plain 8'0" x 3'0" ebony leaf
  await page.getByRole('radio', { name: /Leaf only/ }).click()
  await page.getByRole('radio', { name: /30 mm/ }).click()
  await page.locator('.cfg__tick').nth(3).click()
  await page.locator('.cfg__tone').nth(4).click() // ebony
  const price = await page.locator('.pdp__price').innerText()
  if (!price.includes('86,900')) throw new Error(`reset to 8'x3' ebony gave ${price}`)
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
  await page.getByRole('button', { name: /Open WhatsApp with my order/ }).click()
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
  await page.getByRole('button', { name: /Open WhatsApp with my order/ }).click()
  await page.waitForURL('**/order-confirmed')
  const wa = await page.evaluate(() => window.__waUrl)
  if (!wa) throw new Error('wa.me url not captured')
  const decoded = decodeURIComponent(wa)
  for (const frag of [
    `wa.me/${WA_NUMBER}`,
    'NEW ORDER — PD-',
    'The Meridian',
    'The Flute',
    // the workshop needs the measured size and the spec, not just the name
    '96″ × 36″',
    '30 mm',
    'Vivek Patel',
    '380001',
    'Preferred visit',
  ]) {
    if (!decoded.includes(frag)) throw new Error(`wa message missing: ${frag}`)
  }
  console.log('   wa.me OK:', decoded.slice(0, 120).replaceAll('\n', ' | '))

  const waId = decoded.match(/PD-[A-Z0-9]+/)?.[0]
  if (!waId) throw new Error('no order id in the wa.me message')

  // A handoff that worked must read as one. `blocked` is only true when the
  // pop-up was refused, and it was true on every order for as long as
  // `window.open` was passed `noopener` — so the last screen of the funnel
  // told every customer their order had failed. Assert the receipt, and that
  // the recovery button that belongs to the blocked path is absent.
  const sub = await page.locator('.confirmed__sub').innerText()
  if (/blocked/i.test(sub)) throw new Error(`confirmation claims the popup was blocked: ${sub}`)
  if (!sub.includes(waId)) throw new Error(`confirmation does not show the order id: ${sub}`)
  if (await page.locator('.confirmed__open').count()) {
    throw new Error('blocked-path button rendered after a successful handoff')
  }
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

await step('mobile door wall taps open the full-screen photo', async () => {
  await gotoDoorWall()
  if (await page.locator('.doorwall__viewer').count()) throw new Error('split viewer should be desktop-only')
  await clickDoorWall()
  await page.waitForSelector('.doorzoom', { timeout: 3000 })
  await shot('15-mobile-doorwall')
  await page.locator('.doorzoom__close').click()
  await page.waitForTimeout(300)
  if (await page.locator('.doorzoom').count()) throw new Error('overlay did not close')
  const locked = await page.evaluate(() => document.documentElement.style.overflow)
  if (locked === 'hidden') throw new Error('scroll lock survived the overlay')
})

await step('mobile shop + pdp', async () => {
  await page.goto(BASE + '/product/haveli', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot('16-mobile-pdp')
})

await step('mobile configurator targets are thumb-sized', async () => {
  await page.waitForSelector('.dim__input')
  // the slider itself, the ± nudges and the common-size pills all have to be
  // grabbable with a thumb, not a cursor
  for (const sel of ['.dim__input', '.dim__nudge', '.cfg__tick', '.cfg__opt']) {
    const box = await page.locator(sel).first().boundingBox()
    if (!box) throw new Error(`${sel} not rendered on mobile`)
    if (box.height < 44) throw new Error(`${sel} is only ${Math.round(box.height)}px tall on mobile`)
  }
  // and dragging must actually reprice
  const before = await page.locator('.pdp__price').innerText()
  await page.locator('.dim__input').first().fill('78')
  if ((await page.locator('.pdp__price').innerText()) === before) throw new Error('mobile slider did not reprice')
})
await shot('17-mobile-configurator')

/* ── TRY AT HOME (/try/:id) ────────────────────────────── */
/* Still at 390×844 from the mobile block — this feature is phone-first and the
   handles have a 44px floor to clear.

   The doorway photo is synthesised rather than committed: sharp is already a
   devDependency, and a fixture with known geometry lets the guess be asserted
   numerically instead of eyeballed. */
const doorwayJpeg = await (async () => {
  const sharp = (await import('sharp')).default
  return sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
      <rect width="1200" height="900" fill="#d8d2c6"/>
      <rect y="760" width="1200" height="140" fill="#8d7c63"/>
      <polygon points="470,150 745,168 738,792 478,775" fill="#5a4632"/>
      <polygon points="486,170 729,186 723,772 493,757" fill="#4a3828"/>
    </svg>`),
  )
    .jpeg({ quality: 88 })
    .toBuffer()
})()

const placeDoor = async () => {
  await page.goto(`${BASE}/try/kyoto?h=84&w=33&t=teak`, { waitUntil: 'networkidle' })
  await page.setInputFiles('.try__file', {
    name: 'doorway.jpg',
    mimeType: 'image/jpeg',
    buffer: doorwayJpeg,
  })
  await page.waitForSelector('.tryd', { timeout: 10000 })
}

await step('try-at-home is offered on doors and refused on materials', async () => {
  // The scope rule, asserted rather than trusted: every door, nothing but
  // doors. WPC doors are doors; timber and ply are not. See tryState().
  await page.goto(`${BASE}/product/kyoto`, { waitUntil: 'networkidle' })
  const href = await page.locator('.pdp__try').getAttribute('href')
  if (!href?.startsWith('/try/kyoto?h=')) throw new Error(`bad try href: ${href}`)

  await page.goto(`${BASE}/product/burmese-teak`, { waitUntil: 'networkidle' })
  if (await page.locator('.pdp__try').count()) throw new Error('timber must not offer the doorway view')

  await page.goto(`${BASE}/try/burmese-teak`, { waitUntil: 'networkidle' })
  const note = await page.locator('.try__note').innerText()
  if (!/is for doors/i.test(note)) throw new Error(`timber got the wrong refusal: ${note}`)

  // A photographed door IS a door — it just has no square-on cutout yet, so it
  // must get the temporary refusal, never the "not a door" one.
  await page.goto(`${BASE}/try/wpc-cnc-door`, { waitUntil: 'networkidle' })
  const wpc = await page.locator('.try__note').innerText()
  if (/is for doors/i.test(wpc)) throw new Error('a WPC door was refused as "not a door"')
})

await step('handheld AR stays invisible where WebXR is not backed by ARCore', async () => {
  /* Headless Chrome exposes no navigator.xr, which is the same answer every
     iPhone gives — so this is the majority case, not an edge one. The rule it
     protects: AR appears where it works and is *absent* everywhere else, with
     the photo flow left whole rather than turned into its fallback. A disabled
     button or an "unsupported" notice would both fail this.

     ⚠️ Asserting the chunk too, not just the button. ArPlacement mounts as soon
     as support resolves — that is what preserves the tap's activation for
     requestSession — so a regression in the gate would be invisible in the UI
     while still shipping a WebGL renderer to every iPhone on the route. */
  await page.goto(`${BASE}/try/kyoto`, { waitUntil: 'networkidle' })
  if (await page.locator('.arx__open').count()) throw new Error('AR was offered on a device without WebXR')
  if (await page.locator('.arx__overlay').count()) throw new Error('the AR overlay root mounted without WebXR')
  const fetched = await page.evaluate(() =>
    performance.getEntriesByType('resource').some((r) => /ArPlacement-.*\.js$/.test(r.name)),
  )
  if (fetched) throw new Error('the AR chunk was fetched on a device that cannot use it')

  // The photo flow is the feature, not a fallback — it must be untouched.
  const buttons = await page.locator('.try__pickrow button').count()
  if (buttons !== 2) throw new Error(`expected both photo buttons, found ${buttons}`)
})

await step('a bare /try link falls back to the standard door size', async () => {
  /* No query at all is what a pasted or shared link looks like. `Number(null)`
     is 0 and `Number.isFinite(0)` is true, so this once produced a 0×0 door
     clamped to the smallest size we sell, and the shared picture went out
     stamped 5′ × 1′8″. */
  await page.goto(`${BASE}/try/kyoto`, { waitUntil: 'networkidle' })
  const name = await page.locator('.try__name').innerText()
  if (!/8′\s*×\s*3′/.test(name)) throw new Error(`expected the 8′ × 3′ default, got: ${name}`)
})

await step('a photo places the door and the warp is a real matrix3d', async () => {
  await placeDoor()
  const inline = await page.locator('.tryd').evaluate((el) => el.style.transform)
  if (!inline.startsWith('matrix3d(')) throw new Error(`not a 3D warp: ${inline}`)
  // CSS <number> has no exponential notation; an "1e-7" in the w row would
  // invalidate the whole matrix3d and silently drop the transform.
  if (/e[+-]/i.test(inline)) throw new Error(`exponential notation in matrix3d: ${inline}`)
  if (!(await page.locator('.try__privacy, .tryq__handle').first().count()))
    throw new Error('placement UI missing')
})

await step('the opening guess lands on the door, not the middle of the frame', async () => {
  const pts = await page.locator('.tryq__outline polygon').getAttribute('points')
  const xs = pts.split(' ').map((p) => Number(p.split(',')[0]))
  const frame = await page.locator('.try__frame').boundingBox()
  const spread = (Math.max(...xs) - Math.min(...xs)) / frame.width
  // The fixture's door spans ~23% of the width.
  if (spread < 0.12 || spread > 0.45) throw new Error(`guess span implausible: ${Math.round(spread * 100)}%`)
})

await step('every outline handle is thumb-sized', async () => {
  const handles = page.locator('.tryq__handle')
  const n = await handles.count()
  if (n !== 8) throw new Error(`expected 4 corners + 4 edges, got ${n}`)
  for (let i = 0; i < n; i++) {
    const b = await handles.nth(i).boundingBox()
    if (!b || b.height < 44 || b.width < 44) throw new Error(`handle ${i} is ${b?.width}×${b?.height}`)
  }
})
await shot('18-try-placed')

await step('dragging a corner keystones the door', async () => {
  const before = await page.locator('.tryd').evaluate((el) => getComputedStyle(el).transform)
  const b = await page.locator('.tryq__handle--corner').first().boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 - 40, b.y + b.height / 2 - 30, { steps: 8 })
  await page.mouse.up()
  const after = await page.locator('.tryd').evaluate((el) => getComputedStyle(el).transform)
  if (before === after) throw new Error('the door did not follow the handle')
  // A dragged corner makes a genuine trapezoid, which no affine map can carry,
  // so the computed transform must now be a real matrix3d rather than a
  // normalised matrix().
  if (!after.startsWith('matrix3d(')) throw new Error(`perspective was lost: ${after}`)
})

await step('a self-crossing drag is refused, not blanked', async () => {
  // A folded quad puts w <= 0 on a vertex and Chrome makes the element vanish
  // outright, so the editor has to reject the move and keep the last good one.
  const frame = await page.locator('.try__frame').boundingBox()
  const b = await page.locator('.tryq__handle--corner').first().boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(frame.x + frame.width - 4, frame.y + frame.height - 4, { steps: 12 })
  await page.mouse.up()
  const tf = await page.locator('.tryd').evaluate((el) => el.style.transform)
  if (!tf.startsWith('matrix3d(')) throw new Error(`transform went invalid: ${tf}`)
  const box = await page.locator('.tryd').boundingBox()
  if (!box || box.width < 10) throw new Error('the door blanked on a folded quad')
})

await step('the composed picture carries the brand strip', async () => {
  await placeDoor()
  await page.locator('.try__done').click()
  await page.waitForSelector('.try__out', { timeout: 25000 })
  const dims = await page.locator('.try__out').evaluate((el) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
  }))
  if (dims.w !== 1200) throw new Error(`unexpected width ${dims.w}`)
  if (dims.h <= 900) throw new Error(`the footer strip is missing (height ${dims.h})`)
})
await shot('19-try-result')

await step('the photo yields a size estimate and a price', async () => {
  // The fixture door is 275×640px in a head-on-ish shot, so its true ratio is
  // ~0.43; told it is 84" tall, the width should land near 36".
  const chips = page.locator('.try__chip')
  if ((await chips.count()) !== 4) throw new Error('expected four height chips')
  for (let i = 0; i < 4; i++) {
    const b = await chips.nth(i).boundingBox()
    if (!b || b.height < 44) throw new Error(`height chip ${i} is only ${b?.height}px tall`)
  }
  await chips.nth(2).click() // 7′0″ = 84"
  await page.waitForSelector('.try__est', { timeout: 3000 })
  const est = await page.locator('.try__est').innerText()

  /* Sizes print as feet-inches with vulgar fractions — 2′7½″. This is a
     plausibility band, not an accuracy check: the outline here is the opening
     *guess*, which carries a standard leaf's proportions rather than the
     fixture's. The geometry itself is verified against a synthetic camera in
     `npm run verify:geometry`. */
  const inches = (ft, whole, frac) =>
    Number(ft) * 12 + Number(whole ?? 0) + { '¼': 0.25, '½': 0.5, '¾': 0.75 }[frac ?? ''] || Number(ft) * 12
  const m = est.match(/(\d+)′(?:(\d+)([¼½¾])?″)?\s*×\s*(\d+)′(?:(\d+)([¼½¾])?″)?/)
  if (!m) throw new Error(`unparseable estimate: ${est}`)
  const widthIn = inches(m[4], m[5], m[6])
  if (widthIn < 24 || widthIn > 46) throw new Error(`implausible width ${widthIn}″ from ${est}`)
  if (!/₹/.test(est)) throw new Error(`no price beside the estimate: ${est}`)
  // The number is good to about an inch and the workshop cuts from WhatsApp,
  // so it must never appear without saying it is an estimate.
  if (!/estimated|measure/i.test(est)) throw new Error(`the estimate carries no caveat: ${est}`)
})

await step('the estimate reaches WhatsApp with its caveat attached', async () => {
  const href = await page.locator('.try__actions a[href*="wa.me"]').getAttribute('href')
  const text = decodeURIComponent(href.split('text=')[1] ?? '')
  if (!/measures about/i.test(text)) throw new Error(`the size never made it: ${text}`)
  if (!/confirm/i.test(text)) throw new Error(`an unlabelled size reached the workshop message: ${text}`)
})

await step('sharing hands WhatsApp a real image file', async () => {
  await page.locator('.try__done').click()
  await page.waitForTimeout(500)
  const shared = await page.evaluate(() => window.__shared)
  if (!shared) throw new Error('navigator.share was never called')
  if (shared.type !== 'image/jpeg') throw new Error(`wrong type: ${shared.type}`)
  if (shared.size < 15000) throw new Error(`the file is too small to be a photo: ${shared.size}`)
  if (!shared.name.endsWith('-in-my-doorway.jpg')) throw new Error(`bad filename: ${shared.name}`)
  if (!/Kyoto/.test(shared.text)) throw new Error(`share text lost the design: ${shared.text}`)
})

await step('the wa.me fallback carries the design and the size', async () => {
  const href = await page.locator('.try__actions a[href*="wa.me"]').getAttribute('href')
  if (!href.includes(WA_NUMBER)) throw new Error('wrong WhatsApp number')
  const text = decodeURIComponent(href.split('text=')[1] ?? '')
  if (!/Kyoto/.test(text)) throw new Error(`thin message: ${text}`)
  // In-app browsers truncate long URLs silently — same ceiling checkout keeps.
  if (href.length > 1900) throw new Error(`over the wa.me ceiling: ${href.length}`)
})

await step('leaving the try screen restores the site chrome', async () => {
  await page.locator('.try__back').click()
  await page.waitForSelector('.pdp', { timeout: 5000 })
  const stuck = await page.evaluate(() => document.body.classList.contains('has-fullscreen'))
  if (stuck) throw new Error('has-fullscreen survived the route change — nav stays hidden')
})

/* ── report ────────────────────────────────────────────── */
console.log('\n──── console noise ────')
console.log(logs.length ? logs.slice(0, 20).join('\n') : '(none)')
console.log('\n──── result ────')
console.log(errors.length ? `FAILURES:\n${errors.join('\n')}` : 'ALL CHECKS PASSED')
await browser.close()
process.exit(errors.length ? 1 : 0)
