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
  /* A synthetic camera, so the viewfinder is testable rather than merely
     assumed. Chrome's fake device produces a rolling pattern at a real
     resolution and the fake UI auto-grants the permission prompt, which
     together cover everything the live path does except the lens itself. */
  /* ⚠️ These two and no more. `--auto-accept-camera-and-microphone-capture`
     was tried alongside them and crashes this Chrome on launch (SIGTRAP before
     the first page); it is also redundant, since the fake UI already answers
     the permission prompt. */
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
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

/* Scroll to a fraction of the hero track. The keyhole hero's phases are
   fractions of track progress, so every assertion below is written in those
   terms rather than in pixels.

   ⚠️ It converges rather than aiming once, and it has to. Lenis multiplies
   wheel deltas, so `wheelTo` reaches its target and stops feeding the wheel
   while Lenis is still travelling toward a target of its own that is further
   on — the settle at the end of wheelTo then carries the page past where it
   was asked to stop. The error is proportional to the distance covered, so
   re-aiming from the new position converges in two passes; left uncorrected it
   compounds across consecutive steps, which is what put a "scroll to 16% of
   the track" assertion at 24% and a "scroll to 88%" one off the end of the
   track entirely, with the sticky released and the wall out of the viewport. */
async function heroTo(frac) {
  for (let i = 0; i < 4; i++) {
    const { y, cur } = await page.evaluate((f) => {
      const el = document.querySelector('.portal')
      return {
        y: el.offsetTop + (el.offsetHeight - window.innerHeight) * f,
        cur: window.scrollY,
      }
    }, frac)
    if (Math.abs(cur - y) <= 10) return
    await wheelTo(y)
  }
}

await step('the hero ships no WebGL backdrop', async () => {
  /* The portal hero puts a three.js canvas behind its opening phase — 238 kB
     gzipped, more than twice the rest of the site. This hero has none, and the
     assertion is on the *fetch* rather than on the markup for the same reason
     the handheld-AR one is: a gate that regresses ships the payload to every
     visitor long before anything looks wrong on screen. Nothing here may pull
     `three`, so the whole hero is walked before the verdict. */
  const heavy = []
  const watch = (r) => {
    if (/Beams|three/i.test(new URL(r.url()).pathname)) heavy.push(new URL(r.url()).pathname)
  }
  page.on('request', watch)
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero__title')
  await heroTo(0.5)
  await heroTo(1)
  page.off('request', watch)
  if (heavy.length) throw new Error(`the keyhole hero fetched a WebGL chunk: ${heavy.join(', ')}`)
  if (await page.locator('.portal__rays canvas').count()) throw new Error('a Beams canvas is mounted in the keyhole hero')
  /* Back to the top through Lenis, not with a raw scrollTo — Lenis owns wheel
     scrolling and lerps the page back to its own target, so a raw jump leaves
     the next step starting from a position that is still moving. */
  await wheelTo(0)
})

await step('the door up front is locked, and the key flies you to the wall', async () => {
  /* The full-screen keyhole plate that opened by re-projecting its own viewBox
     was phase A until 2026-08-31. It is asserted ABSENT, the way `/`'s FAQ
     accordion is, so bringing it back trips this rather than quietly leaving
     two ways in on the same screen. */
  if (await page.locator('.keyhole').count()) throw new Error('the full-screen keyhole plate is back in the hero')

  await page.waitForSelector('.kgate__lock')
  /* ⚠️ The plate is ~34px on a desktop and ~26px on a phone; the padding is
     what buys the 44px. Measure the button, which is the target. */
  const box = await page.locator('.kgate__lock').boundingBox()
  if (!(box.width >= 44 && box.height >= 44))
    throw new Error(`the lock is not a 44px target (${Math.round(box.width)}×${Math.round(box.height)})`)

  /* On the handle side. The leaf hinges left everywhere on this site, so a
     lock left of the door's centre is a lock on the hinge — which is what a
     mirrored or reordered leaf would silently produce. */
  const doorMid = await page.evaluate(() => {
    const r = document.querySelector('.ktun__door').getBoundingClientRect()
    return r.left + r.width / 2
  })
  if (!(box.x > doorMid)) throw new Error('the lock is on the hinge side of the door')

  /* ⚠️ The flight is the page scrolling and nothing else — one animation, the
     scrolled one, so what the button gives you is provably what a wheel gives
     you. This asserts the scroll position actually moved, which is what would
     catch someone reimplementing it as a local animation with a jump at the
     end. */
  const progress = () =>
    page.evaluate(() => {
      const el = document.querySelector('.portal')
      return (window.scrollY - el.offsetTop) / (el.offsetHeight - window.innerHeight)
    })
  await page.locator('.kgate__lock').click()
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.portal')
      return (window.scrollY - el.offsetTop) / (el.offsetHeight - window.innerHeight) > 0.8
    },
    { timeout: 8000 },
  )
  const landed = await progress()
  /* Past WALL_FULL and past the head's reveal: you arrive at a wall that is
     lit, titled and interactive, not at one still fading up. */
  if (Number(await page.evaluate(() => getComputedStyle(document.querySelector('.ktwall')).opacity)) < 0.99)
    throw new Error(`the key landed short of the wall (p ${landed.toFixed(2)})`)
  if (!(await page.locator('.drift-wall__tile').count())) throw new Error('the key landed on an empty pane')

  /* And the lock goes with the door it is drawn on: it is a flat layer, so a
     brass plate still pinned mid-screen while the door rushed forward would
     slide straight off it — and a transparent button over the middle of the
     wall would swallow a click meant for a tile. */
  if (await page.locator('.kgate').count()) throw new Error('the lock is still mounted after the flight')

  await wheelTo(0)
  await page.waitForSelector('.kgate__lock')

  /* ⚠️ **The key must be turnable again.** Scrolling back up puts you in front
     of the same locked door, and trying the key a second time is the first
     thing anyone does. It latched on the first turn until 2026-08-31: the key
     stayed at −96° and the button refused every further tap. */
  if (await page.locator('.kgate__lock[data-unlocking]').count())
    throw new Error('the key is still turned after scrolling back to the door')
  await page.locator('.kgate__lock').click()
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.portal')
      return (window.scrollY - el.offsetTop) / (el.offsetHeight - window.innerHeight) > 0.8
    },
    { timeout: 8000 },
  )
  await wheelTo(0)
  await page.waitForSelector('.kgate__lock')
})

await step('the tunnel doors carry no will-change', async () => {
  /* ⚠️ A guard for a bug this browser cannot see. Headless Chrome rasterises
     in software; on a real GPU, `will-change` on a door pins its raster and
     Chrome reuses it instead of re-rastering — and a door's composited scale
     runs 0.08 → 4.5 across the flight. Fly to the wall, scroll back, and the
     door up front returned in horizontal bands with the doors behind showing
     through the gaps. Safari was fine throughout, which is what made it look
     like someone else's problem.
     Removing the hint costs nothing (measured: identical layer count, 72
     either way, because `translate3d` already promotes), so this asserts the
     declaration is simply absent rather than trying to photograph the tear. */
  const hinted = await page.evaluate(() =>
    ['.ktun__door', '.ktun__leaf']
      .filter((sel) => {
        const el = document.querySelector(sel)
        const wc = el && getComputedStyle(el).willChange
        return wc && wc !== 'auto'
      })
      .join(', '),
  )
  if (hinted) throw new Error(`will-change is back on ${hinted} — this tears the hero in Chrome`)
})

await step('the tunnel is real door photographs, flying at the camera', async () => {
  const srcs = await page.$$eval('.ktun__leaf img', (els) => els.map((e) => new URL(e.src).pathname))
  if (srcs.length !== 5) throw new Error(`expected 5 tunnel doors, got ${srcs.length}`)
  /* Leaf cut-outs, not catalogue covers: a cover brings the showroom wall and
     architrave along with it, which is the one thing a door flying past the
     camera must not have. */
  const stray = srcs.filter((s) => !s.startsWith('/images/leaves/'))
  if (stray.length) throw new Error(`tunnel door is not a leaf cut-out: ${stray[0]}`)

  /* A door must genuinely grow on approach, and must then leave. This is the
     check that would have caught the first cut of the tunnel, where NEAR was
     small enough that every door faded out at about the size it came in at.

     ⚠️ Measure the largest VISIBLE door, not `.ktun__door:first-child`. Two
     reasons, and the second one bit. `wheelTo` lands within a dozen pixels but
     Lenis multiplies wheel deltas, so a short hop overshoots by enough that the
     first door may already have gone by. And a door past the camera sits at
     z > perspective, where the projection inverts and `getBoundingClientRect`
     hands back a nonsense number — which is how an earlier version of this
     assertion passed while measuring a door that was behind the viewer. */
  const biggest = () =>
    page.evaluate(() =>
      Math.max(
        ...[...document.querySelectorAll('.ktun__door')]
          .filter((el) => el.style.visibility !== 'hidden')
          .map((el) => el.getBoundingClientRect().height),
      ),
    )
  const far = await biggest()
  await heroTo(0.3)
  const near = await biggest()
  if (!(near > far * 1.8)) throw new Error(`door did not fly at the camera (${Math.round(far)}px → ${Math.round(near)}px)`)

  /* …and off the other side: the first door is gone once it has passed.
     ⚠️ Asserted on what is on SCREEN — the effective opacity — not on React's
     inline `style.visibility`. That property only exists on the JS fallback
     path; where the browser has scroll-driven animations the compositor owns
     the door's opacity and React deliberately writes nothing, so testing the
     inline style was testing which code path was running, not whether the door
     had left. */
  await heroTo(0.45)
  const goneOpacity = await page.evaluate(() => {
    const d = document.querySelector('.ktun__door')
    if (d.style.visibility === 'hidden' || getComputedStyle(d).visibility === 'hidden') return 0
    return Number(getComputedStyle(d).opacity)
  })
  if (goneOpacity > 0.01) throw new Error(`the first door never flew past the camera (opacity ${goneOpacity})`)
})
await shot('02-home-hero-tunnel')

await step('the last door opens onto the wall, not onto a dead frame', async () => {
  /* The landing has to be lit before the final fly-by finishes — you fly
     through the last door INTO the wall, which is the whole reason the wall is
     stacked under .ktun rather than after it. It was not, once: the tunnel ran
     to 0.76 and the landing opened at 0.72, and because that fade takes a
     further stretch to reach strength the screen was empty black across roughly
     0.67–0.80, the exact moment the hero is supposed to be arriving somewhere. */
  await heroTo(0.63)
  const vis = await page.evaluate(() => getComputedStyle(document.querySelector('.ktwall')).opacity)
  if (Number(vis) < 0.6) throw new Error(`landing still dark while the last door passes (opacity ${vis})`)
  if (!(await page.locator('.drift-wall__tile').count())) throw new Error('no wall behind the last door')
})

await step('?hero=old still renders the portal hero', async () => {
  /* Temporary, and it goes when the prototype is resolved: while both heroes
     are in the tree the old one keeps its coverage. */
  await page.goto(BASE + '/?hero=old', { waitUntil: 'networkidle' })
  await page.waitForSelector('.pdoor__unit')
  await page.waitForSelector('.pdoor__leaf img')
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero__title')
})

await step('the hero lands on the door wall (phase C)', async () => {
  /* ⚠️ Two halves, and the first is the one that regresses. StrokeText's own
     ScrollTrigger cannot drive this headline: inside a 100dvh sticky pane the
     title sits mid-viewport from the top of the track, so `start: 'top 82%'` is
     already satisfied when the trigger is created and the draw plays out
     minutes of scroll before the wall is on screen. (That is why the compact
     variant carried a plain <h2> between 2026-08-23 and 2026-08-31.) DoorWall
     mounts the component on the hero's own head reveal instead, so this pins
     both ends: nothing drawing while the tunnel is still flying, drawn and
     settled once it has landed.
  ⚠️ 0.30 for the first half, not something nearer the 0.64 reveal: `wheelTo`
     drives real wheel events through Lenis and its momentum overshoots by a
     good fraction of a screen, so a park at 0.55 crosses the reveal on the way
     and latches the draw — correctly, since a visitor who flings the page past
     0.64 has arrived. 0.30 is past the wall's own mount (p > 0.24), so the
     landing is really in the DOM and the absence below means something. */
  await heroTo(0.3)
  if (!(await page.locator('.ktwall .doorwall').count()))
    throw new Error('the landing has not mounted by p=0.3, so the check below proves nothing')
  if (await page.locator('.ktwall .stroke-text__svg').count())
    throw new Error('the headline is drawing while the tunnel still flies — it is over before anyone arrives')

  await heroTo(0.95)
  const vis = await page.evaluate(() => getComputedStyle(document.querySelector('.ktwall')).opacity)
  if (Number(vis) < 0.9) throw new Error(`landing not faded in (opacity ${vis})`)
  await page.waitForSelector('.doorwall__wall')
  await page.waitForSelector('.ktwall .stroke-text__svg')
  /* The whole timeline is ~3.4s (draw 1.7 + a 0.52 stagger, then 0.3 delay and
     a 0.85 fade), so it is waited out rather than sampled mid-flight.
     ⚠️ The fill is measured as the product of every opacity from the <tspan> up
     to the <svg>, NOT as the tspan's own. gsap animates the tspans, so a
     stylesheet that parks the parent <text> at 0 leaves the tspan reading a
     perfectly healthy 1 while the letters render hollow — which is exactly what
     shipped on 2026-08-31 and exactly what this step failed to catch. Opacity
     composites; it does not inherit. Ask what is on screen, not what one node
     was told. */
  await page
    .waitForFunction(
      () => {
        const st = document.querySelector('.ktwall .stroke-text__stroke tspan')
        const fl = document.querySelector('.ktwall .stroke-text__fill tspan')
        if (!st || !fl) return false
        let effective = 1
        for (let n = fl; n && n !== document.body; n = n.parentElement) {
          effective *= Number(getComputedStyle(n).opacity)
        }
        return parseFloat(getComputedStyle(st).strokeDashoffset) === 0 && effective === 1
      },
      { timeout: 8000 },
    )
    .catch(() => {
      throw new Error('the headline never finished drawing, or drew hollow (the fill never became visible)')
    })
})
await shot('02b-hero-doorwall-landing')

await step('the four worlds have a band of their own further down', async () => {
  /* They were the hero's last phase until 2026-08-23. Three of the four are not
     doors, so a hero that lands on a wall of doors cannot also be their route in
     — they take the mid-page slot the wall vacated. */
  await page.locator('.worldsband').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  const n = await page.locator('.worldsband .wcard').count()
  if (n !== 4) throw new Error(`expected 4 world cards in the band, got ${n}`)
  if (await page.locator('.portal__corridor').count())
    throw new Error('the hero corridor is back as well as the band — the worlds are offered twice')
})

await step('a world card walks into the Timbers world', async () => {
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
  /* Two layouts, because two heroes. Under the keyhole hero the wall IS the
     hero's landing: it lives inside the 100dvh sticky pane, so it is technically
     "at" scroll 0 for the whole track and no reserve-based walk can find it —
     the only address it has is a fraction of track progress. Under the portal
     hero it is still an ordinary mid-page band behind `.doorwall-hold`. */
  const keyhole = await page.locator('.portal--keyhole').count()
  if (keyhole) {
    await heroTo(0.88)
  } else {
    const reserve = await page.evaluate(() => {
      const el = document.querySelector('.doorwall, .doorwall-hold')
      if (!el) return null
      return el.getBoundingClientRect().top + window.scrollY
    })
    if (reserve === null) throw new Error('no door wall (or its reserve) on the home page')
    await wheelTo(reserve)
  }
  await page.waitForSelector('.drift-wall__tile')
  if (keyhole) {
    await page.waitForTimeout(700)
    return
  }
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

await step('the door wall never runs under the hero scrub', async () => {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.waitForSelector('.hero__title')
  /* This is the assertion that matters, and it survived the wall moving into
     the hero: DriftWall writes a transform to all 28 tiles every frame for as
     long as it is mounted AND unpaused, and that loop running underneath a
     scroll-scrubbed hero is what made the portal hero stutter on mid-range
     Androids. Inside the hero the wall is mounted early (the photographs have
     to be decoded before the last door opens onto them) but held with
     `paused`, so what is checked here is that nothing is *animating* — the
     tiles' tracks must still be at their initial transform. */
  /* ⚠️ Mounted at the top of the page is CORRECT here, and was not always: the
     wall used to mount on a scroll threshold, and that mount — chunk, ~56 tiles,
     the first image requests — was a single visible stutter wherever the
     threshold sat. It now happens on the first idle callback after `load`, off
     the scrub entirely. So what is asserted is not absence but stillness. */
  await page.waitForSelector('.drift-wall__tile', { state: 'attached' })
  const moved = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.drift-wall__track')].map((el) => el.style.transform).join('|'),
    )
  let a = await moved()
  await page.waitForTimeout(900)
  if ((await moved()) !== a) throw new Error('door wall is animating at the top of the page')

  await heroTo(0.3)
  a = await moved()
  await page.waitForTimeout(900)
  if ((await moved()) !== a) throw new Error('door wall is animating while the hero is still flying')

  /* …and it stops again on the way out. Progress clamps at 1 and stays there
     once the track is behind you, so a gate written only on `p` leaves the loop
     running for the whole rest of the page — which is what happened, and is the
     leak `useNearViewport` exists to close. */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1200)
  a = await moved()
  await page.waitForTimeout(900)
  if ((await moved()) !== a) throw new Error('door wall still animating below the hero')
  await wheelTo(0)
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
/* 37 is a floor, not an equality, and that changed on 2026-08-30 when the
   storefront started reading the CMS live (src/data/liveCatalog.ts): the client
   can add a door in /admin and it is on this page a second later, so pinning an
   exact number here would make their catalogue edits fail our test suite.

   The floor is exact and permanent all the same. `buildCatalogue` starts from
   the 37 local products (15 factory doors + 11 timbers + 8 ply + 3 WPC — 37,
   not 49, since the 12 drawn "Designer Studio" doors were removed on
   2026-08-20) and the CMS only ever *overrides* one by id or appends a new
   slug. Fewer than 37 cards means the merge dropped something. */
const LOCAL_COUNT = 37
const LOCAL_DOORS = 15
/** How many cards the catalogue actually showed, so the filter can be checked
    against it rather than against a number that moves when the client edits. */
let allCards = 0
await step(`catalogue shows every product (≥${LOCAL_COUNT})`, async () => {
  await page.goto(BASE + '/shop', { waitUntil: 'networkidle' })
  await page.waitForSelector('.card')
  allCards = await page.locator('.card').count()
  const n = allCards
  if (n < LOCAL_COUNT) throw new Error(`expected ≥${LOCAL_COUNT} cards, got ${n}`)
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
  if (n < LOCAL_DOORS) throw new Error(`expected ≥${LOCAL_DOORS} doors, got ${n}`)
  if (allCards && n >= allCards) throw new Error(`the world filter kept every card (${n} of ${allCards})`)
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
  await page.goto(BASE + '/door/burma-teak-door', { waitUntil: 'networkidle' })
  await page.waitForURL('**/product/burma-teak-door')
})

/** Drag a dimension slider to an exact value and return the new price text. */
const setDim = async (which, inches) => {
  await page.locator('.dim__input').nth(which === 'height' ? 0 : 1).fill(String(inches))
  return page.locator('.pdp__price').innerText()
}

await step('product page + made-to-measure configurator', async () => {
  await page.goto(BASE + '/product/burma-teak-door', { waitUntil: 'networkidle' })
  await page.waitForSelector('.pdp__price')
  const p1 = await page.locator('.pdp__price').innerText()
  if (!p1.includes('68,000')) throw new Error(`default price wrong (8'x3' plain 30mm = product.price): ${p1}`)

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

  /* No finish swatches: every sellable door is a photograph of a real leaf now,
     and a photograph has one finish — the one it was shot in. `tonesFor()`
     returns [] for a photo visual, so the Finish fieldset does not render. The
     drawn-door path that owned it went with the Designer Studio doors. */
  if (await page.locator('.cfg__tone').count()) throw new Error('a photographed door offered SVG finishes')
})
await shot('06-pdp-burma-teak')

await step('add to cart shows toast and badge', async () => {
  // back to a plain 8'0" x 3'0" leaf
  await page.getByRole('radio', { name: /Leaf only/ }).click()
  await page.getByRole('radio', { name: /30 mm/ }).click()
  await page.locator('.cfg__tick').nth(3).click()
  const price = await page.locator('.pdp__price').innerText()
  if (!price.includes('68,000')) throw new Error(`reset to 8'x3' gave ${price}`)
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
await step('add second product (membrane door)', async () => {
  await page.goto(BASE + '/product/membrane-door', { waitUntil: 'networkidle' })
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
    'Burma Teak Door',
    'Membrane Doors',
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
  /* ⚠️ A phone gets the same five doors as a desktop. It ran a three-door
     subset until 2026-08-31, chosen on weight — these are hero-critical images
     so the run is the payload — and showing the whole floor won the argument.
     Asserted here because a weight-saving pass is exactly the kind of change
     that would quietly put the subset back. */
  const leaves = await page.locator('.ktun__leaf img').count()
  if (leaves !== 5) throw new Error(`the phone got ${leaves} tunnel doors, not 5`)
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
  await page.goto(BASE + '/product/architect-teak-door', { waitUntil: 'networkidle' })
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
  await page.goto(`${BASE}/try/membrane-door?h=84&w=33`, { waitUntil: 'networkidle' })
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
  await page.goto(`${BASE}/product/membrane-door`, { waitUntil: 'networkidle' })
  const href = await page.locator('.pdp__try').getAttribute('href')
  if (!href?.startsWith('/try/membrane-door?h=')) throw new Error(`bad try href: ${href}`)

  await page.goto(`${BASE}/product/burmese-teak`, { waitUntil: 'networkidle' })
  if (await page.locator('.pdp__try').count()) throw new Error('timber must not offer the doorway view')

  await page.goto(`${BASE}/try/burmese-teak`, { waitUntil: 'networkidle' })
  const note = await page.locator('.try__note').innerText()
  if (!/is for doors/i.test(note)) throw new Error(`timber got the wrong refusal: ${note}`)

  /* A WPC door is a door — WPC is what the leaf is made of, not a different
     kind of product. It used to reach the *temporary* refusal here because no
     photograph had a leaf cut-out; every catalogue door has one since
     2026-08-20 (`npm run leaves:build`), so it must now place, not refuse. */
  await page.goto(`${BASE}/product/wpc-cnc-door`, { waitUntil: 'networkidle' })
  if (!(await page.locator('.pdp__try').count())) throw new Error('a WPC door was denied the doorway view')
  await page.goto(`${BASE}/try/wpc-cnc-door`, { waitUntil: 'networkidle' })
  if (await page.locator('.try__note').count()) throw new Error('a WPC door was refused the doorway view')
  await page.waitForSelector('.try__pickrow')

  /* And a sheet of WPC board is not a door, which is the other half of the
     rule — same world, opposite answer. */
  await page.goto(`${BASE}/try/wpc-sheets`, { waitUntil: 'networkidle' })
  const sheet = await page.locator('.try__note').innerText()
  if (!/is for doors/i.test(sheet)) throw new Error(`WPC board got the wrong refusal: ${sheet}`)
})

await step('a door from every range offers the doorway view', async () => {
  /* The regression this exists for: "see it in your doorway" worked only for
     the twelve drawn Designer Studio doors and reported `soon` for all 17 real
     ones, because `isLeafCrop` was never set on a single catalogue photograph.
     Removing the drawn doors would have left the feature working for nothing.

     One door per range rather than one door full stop — a single passing door
     is exactly what hid this. The exhaustive check over the whole catalogue is
     in `npm run verify:geometry`, which can read the data directly instead of
     paying a page load per product. */
  for (const id of ['burma-teak-door', 'honne-ab-door', 'veneer-cng-door', 'primer-door', 'korean-membrane-door']) {
    await page.goto(`${BASE}/product/${id}`, { waitUntil: 'networkidle' })
    if (!(await page.locator('.pdp__try').count())) throw new Error(`${id} does not offer the doorway view`)
  }
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
  await page.goto(`${BASE}/try/membrane-door`, { waitUntil: 'networkidle' })
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

await step('the live viewfinder opens, frames and hands over a real photo', async () => {
  /* Runs against Chrome's fake capture device. The point of the viewfinder is
     the guides — how square-on the shot is decides whether the size read off
     the outline is good to 1% or 6% — so the guides are asserted alongside the
     capture itself. */
  await page.goto(`${BASE}/try/membrane-door?h=84&w=33`, { waitUntil: 'networkidle' })
  await page.locator('.try__shoot').click()
  await page.waitForSelector('.cam__feed', { timeout: 10000 })

  if ((await page.locator('.cam__upright').count()) !== 2) throw new Error('the framing uprights are missing')
  if (!(await page.locator('.cam__floor').count())) throw new Error('the floor guide is missing')

  /* The shutter stays disabled until a frame actually exists — tapping it on a
     stream that has not started would capture a 0×0 canvas. */
  const shutter = page.locator('.cam__shutter')
  await page.waitForFunction(() => !document.querySelector('.cam__shutter')?.disabled, null, { timeout: 15000 })
  const sb = await shutter.boundingBox()
  if (!sb || sb.height < 44 || sb.width < 44) throw new Error(`shutter is only ${sb?.width}×${sb?.height}`)

  await shutter.click()

  // The viewfinder closes onto the place step, with the outline already up.
  await page.waitForSelector('.tryq__handle--corner', { timeout: 15000 })
  if (await page.locator('.cam').count()) throw new Error('the viewfinder stayed open after the shot')

  const dims = await page.locator('.try__photo').evaluate((el) => ({
    w: el.naturalWidth,
    h: el.naturalHeight,
  }))
  if (!dims.w || !dims.h) throw new Error('the captured frame has no pixels')
  if (dims.w > 1600 || dims.h > 1600) throw new Error(`the capture skipped the 1600px cap (${dims.w}×${dims.h})`)
})

await step('the camera never replaces the photo-library route', async () => {
  /* Half of all visitors are trying a door they photographed yesterday, and the
     counter staff work from photos customers sent on WhatsApp. Whatever the
     camera does, that button and its input have to survive. */
  await page.goto(`${BASE}/try/membrane-door`, { waitUntil: 'networkidle' })
  if (!(await page.locator('.try__pickrow input.try__file').count()))
    throw new Error('the photo-library input is gone')
})

await step('a bare /try link falls back to the standard door size', async () => {
  /* No query at all is what a pasted or shared link looks like. `Number(null)`
     is 0 and `Number.isFinite(0)` is true, so this once produced a 0×0 door
     clamped to the smallest size we sell, and the shared picture went out
     stamped 5′ × 1′8″. */
  await page.goto(`${BASE}/try/membrane-door`, { waitUntil: 'networkidle' })
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

/* The result screen's finish switcher is deliberately NOT asserted any more.
   It redraws a drawn <DoorArt> in another tone, and no product in the
   catalogue is drawn: every sellable door is a photograph of one real leaf in
   one real finish. `tonesFor()` returns [] for a photo, so the swatch row does
   not render and there is nothing to click. The code stays — it is the path a
   door whose photograph has not landed yet would take through `classic` — but
   a test that drives it would be testing a screen no customer can reach. */

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
  if (!/Membrane Doors/.test(shared.text)) throw new Error(`share text lost the design: ${shared.text}`)
})

await step('the wa.me fallback carries the design and the size', async () => {
  const href = await page.locator('.try__actions a[href*="wa.me"]').getAttribute('href')
  if (!href.includes(WA_NUMBER)) throw new Error('wrong WhatsApp number')
  const text = decodeURIComponent(href.split('text=')[1] ?? '')
  if (!/Membrane Doors/.test(text)) throw new Error(`thin message: ${text}`)
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
