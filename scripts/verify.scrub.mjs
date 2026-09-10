/**
 * Proves the keyhole hero's two scrub paths agree.
 *
 * The hero is driven by CSS scroll-driven animations where the browser has them
 * (`hero-scrub.gen.css`, on the compositor) and by React's per-frame inline
 * styles where it does not. Both read their numbers from `src/lib/heroTunnel.ts`,
 * but the CSS path gets them through a generator and a keyframe interpolation,
 * so "same source" is an argument, not a measurement. This is the measurement:
 * park the real page at a grid of progress values, read what the browser has
 * actually computed for every door, and compare it against the module's own
 * arithmetic.
 *
 * ⚠️ It is a separate verifier from `verify:e2e` for the same reason
 * `verify:geometry` is: this is a fact about numbers, and a browser test that
 * merely clicks through the hero cannot tell a correct tunnel from a plausible
 * one. The bug that made this necessary — the `animation` shorthand resolving
 * `animation-duration` to `0s`, which pinned every door at its END transform —
 * was completely invisible to a smoke test. The hero still rendered doors.
 *
 * BASE=… node scripts/verify.scrub.mjs   (against a dev/preview server)
 */
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const BASE = process.env.BASE ?? 'http://localhost:5199'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const T = await server.ssrLoadModule('/src/lib/heroTunnel.ts')
await server.close()

/* Tolerances. z and the angles are exact wherever the generator emitted exact
   breakpoints; the swing is a cubic sampled at 60 steps, so it carries a real
   interpolation error and this is the budget for it. A tenth of a degree of
   leaf angle and a hundredth of opacity are both far under what an eye
   resolves on a door crossing the screen in ~130ms. */
const TOL = { z: 1.0, deg: 0.15, opacity: 0.012 }

const fails = []
const oks = []
function check(label, got, want, tol) {
  if (!Number.isFinite(got)) return fails.push(`${label}: got ${got}`)
  const d = Math.abs(got - want)
  if (d > tol) fails.push(`${label}: got ${got.toFixed(3)}, want ${want.toFixed(3)} (off by ${d.toFixed(3)})`)
  else oks.push(label)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })

for (const [w, h, label, near, ids] of [
  [390, 844, 'phone', T.NEAR_MOBILE, T.TUNNEL_IDS_MOBILE],
  [1440, 900, 'desktop', T.NEAR, T.TUNNEL_IDS],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 500, hasTouch: w < 500 })
  const page = await ctx.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(2500)

  const on = await page.evaluate(() => CSS.supports('animation-timeline', 'view()'))
  if (!on) {
    console.log(`SKIP ${label}: this browser has no scroll-driven animations, so only the React path runs`)
    await ctx.close()
    continue
  }

  /* ⚠️ scroll = offsetTop + p·(height − viewport), the same thing
     `useTrackProgress` inverts. Using p·height alone silently shifts every
     sample by the nav's height on any layout where the track is not at 0. */
  const geom = await page.evaluate(() => {
    const el = document.querySelector('.portal--keyhole')
    return { top: el.offsetTop, span: el.offsetHeight - window.innerHeight }
  })

  for (const target of [0, 0.05, 0.13, 0.2, 0.31, 0.4, 0.46, 0.54, 0.62, 0.7, 0.85, 1]) {
    await page.evaluate((y) => window.scrollTo(0, y), geom.top + geom.span * target)
    await page.waitForTimeout(220)

    /* ⚠️ Derive p from the scroll position the browser actually settled on, not
       from the one requested: scroll offsets snap to device pixels, and that
       sub-pixel difference showed up as an identical ~2px z error across all
       five doors at once — the signature of a progress offset rather than a
       geometry fault. This is the same expression `useTrackProgress` inverts.
       ⚠️ NOT `animation.currentTime`, which is tempting and wrong: it reports
       progress over the timeline's full *cover* range, not over the element's
       `animation-range`, so on this track it reads exactly half of p. */
    const p = await page.evaluate(
      ({ top, span }) => (window.scrollY - top) / span,
      geom,
    )

    const read = await page.evaluate(() =>
      [...document.querySelectorAll('.ktun__door')].map((d) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(d).transform)
        const leaf = d.querySelector(':scope > .ktun__leaf')
        const lm = new DOMMatrixReadOnly(getComputedStyle(leaf).transform)
        const sm = new DOMMatrixReadOnly(getComputedStyle(d.querySelector(':scope > .ktun__shade')).transform)
        const cs = getComputedStyle(d)
        return {
          z: m.m43,
          hidden: cs.visibility === 'hidden',
          /* ⚠️ The door box carries NO opacity any more (a group opacity is a
             render surface — see global.css); the fog is on the leaf and the
             jamb, and folded into the gap's and the shade's own curves. */
          doorOpacity: Number(cs.opacity),
          opacity: Number(getComputedStyle(leaf).opacity),
          jamb: Number(getComputedStyle(d.querySelector(':scope > .ktun__jamb')).opacity),
          /* rotateY(θ) is m31 = sin θ, m33 = cos θ in DOMMatrix's column-major
             naming. ⚠️ Read the THIRD column, not m11: the leaf's transform is
             `rotateY(θ) scale(0.1)` (global.css, `.ktun__jamb`), and the 2D
             scale multiplies the first two columns — atan2(m31, m11) read a
             fully open door as −88° instead of −72°. The third column is the
             rotated z axis and the scale never touches it. */
          deg: (Math.atan2(lm.m31, lm.m33) * 180) / Math.PI,
          shadeDeg: (Math.atan2(sm.m31, sm.m33) * 180) / Math.PI,
          gap: Number(getComputedStyle(d.querySelector(':scope > .ktun__gap')).opacity),
          shade: Number(getComputedStyle(d.querySelector(':scope > .ktun__shade')).opacity),
        }
      }),
    )

    /* ⚠️⚠️ No door may ever reach the perspective origin. `PERSPECTIVE / (PERSPECTIVE
       − z)` inverts at z = 900 and goes negative past it, so a door out there is
       drawn through a degenerate projection. The field used to run to z ≈ 5060 by
       the end of the track and sat past the camera for the whole dwell — which is
       what tore the hero apart on Android when you scrolled back up, and what
       `doorZ`'s clamp now prevents. It is asserted here rather than left to the
       arithmetic because it is the failure with the worst symptom and the least
       obvious cause: it renders perfectly on the way in. */
    read.forEach((got, i) => {
      if (got.z >= T.PERSPECTIVE) {
        fails.push(`${label} p=${p.toFixed(4)} door${i}: z ${got.z.toFixed(0)} is at/past the camera (${T.PERSPECTIVE})`)
      }
    })

    read.forEach((got, i) => {
      const at = `${label} p=${p.toFixed(4)} door${i}`
      const z = T.doorZ(i, p, near, ids.length)
      const open = i === 0 ? T.gateOpen(p) : T.doorOpen(z, near)
      const fog = T.doorOpacity(z, near)
      check(`${at} z`, got.z, z, TOL.z)
      check(`${at} leaf`, got.deg, -open * T.OPEN_DEG, TOL.deg)
      check(`${at} shade-swing`, got.shadeDeg, -open * T.OPEN_DEG, TOL.deg)
      if (got.doorOpacity !== 1) fails.push(`${at}: the door box has opacity ${got.doorOpacity} — that is a render surface per door (global.css)`)
      /* A door parked by `visibility: hidden` is not being composited and its
         opacity is not what is on screen — the React path owns that flag and it
         is only ever set where the fade has already reached ~0. */
      if (!got.hidden) {
        check(`${at} fog`, got.opacity, fog, TOL.opacity)
        check(`${at} jamb`, got.jamb, fog, TOL.opacity)
        check(`${at} gap`, got.gap, fog * open * T.glowAt(p), TOL.opacity)
        check(`${at} shade`, got.shade, fog * T.shadeOpacity(open), TOL.opacity)
      }
    })

    /* ⚠️ The chrome fades — hall, rays, copy, cue, wall, lock — ride the same
       timeline and were unverified until 2026-09-10, which is how the scroll
       cue shipped stuck at full opacity for a round: `.portal .hero__scrollcue`
       sets `animation: none` to switch off the cue's entrance fade, that
       shorthand also resets `animation-timeline`, and it landed AFTER the
       generated binding in the bundle (main.tsx imported App above the
       stylesheets). Every door check passed the whole time. Anything bound in
       the generator's `chromeBindings` gets a line here. */
    const chrome = await page.evaluate(() => {
      const op = (s) => {
        const e = document.querySelector(s)
        return e ? Number(getComputedStyle(e).opacity) : null
      }
      return {
        hall: op('.ktun__hall'),
        rays: op('.portal__rays'),
        copy: op('.ktun__copy'),
        cue: op('.hero__scrollcue'),
        wall: op('.ktwall'),
        lock: op('.kgate'),
      }
    })
    const at = `${label} p=${p.toFixed(4)}`
    check(`${at} hall`, chrome.hall, T.hallOpacity(p), TOL.opacity)
    check(`${at} rays`, chrome.rays, T.raysOpacity(p), TOL.opacity)
    check(`${at} copy`, chrome.copy, T.copyOpacity(p), TOL.opacity)
    check(`${at} cue`, chrome.cue, T.copyOpacity(p), TOL.opacity)
    check(`${at} wall`, chrome.wall, T.wallOpacity(p), TOL.opacity)
    /* the lock is unmounted by React once it has faded, so absent is correct
       wherever the arithmetic says 0 — and a fault anywhere else */
    if (chrome.lock === null) {
      if (T.lockOpacity(p) > 0.01) fails.push(`${at} lock: unmounted while the arithmetic says ${T.lockOpacity(p).toFixed(2)}`)
      else oks.push(`${at} lock`)
    } else {
      check(`${at} lock`, chrome.lock, T.lockOpacity(p), TOL.opacity)
    }
  }
  await ctx.close()
}
await browser.close()

console.log(`\n${oks.length} checks passed`)
if (fails.length) {
  console.log(`\n${fails.length} FAILED:`)
  for (const f of fails.slice(0, 30)) console.log('  ' + f)
  process.exit(1)
}
console.log('the compositor path matches the arithmetic')
