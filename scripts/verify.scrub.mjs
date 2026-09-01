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

for (const [w, h, label, near] of [
  [390, 844, 'phone', T.NEAR_MOBILE],
  [1440, 900, 'desktop', T.NEAR],
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
        const leaf = d.querySelector('.ktun__leaf')
        const lm = new DOMMatrixReadOnly(getComputedStyle(leaf).transform)
        const cs = getComputedStyle(d)
        return {
          z: m.m43,
          hidden: cs.visibility === 'hidden',
          opacity: Number(cs.opacity),
          // rotateY(θ) is m11 = cos θ, m31 = sin θ in DOMMatrix's column-major naming
          deg: (Math.atan2(lm.m31, lm.m11) * 180) / Math.PI,
          gap: Number(getComputedStyle(d.querySelector('.ktun__gap')).opacity),
          shade: Number(getComputedStyle(leaf.querySelector('.ktun__shade')).opacity),
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
      const z = T.doorZ(i, p, near)
      const open = i === 0 ? T.gateOpen(p) : T.doorOpen(z)
      check(`${at} z`, got.z, z, TOL.z)
      check(`${at} leaf`, got.deg, -open * T.OPEN_DEG, TOL.deg)
      /* A door parked by `visibility: hidden` is not being composited and its
         opacity is not what is on screen — the React path owns that flag and it
         is only ever set where the fade has already reached ~0. */
      if (!got.hidden) {
        check(`${at} fog`, got.opacity, T.doorOpacity(z, near), TOL.opacity)
        check(`${at} gap`, got.gap, open * T.glowAt(p), TOL.opacity)
        check(`${at} shade`, got.shade, T.shadeOpacity(open), TOL.opacity)
      }
    })
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
