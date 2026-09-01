/**
 * Generates `src/styles/hero-scrub.gen.css` — the keyhole hero's scrub as CSS
 * scroll-driven animations, so the tunnel runs on the compositor thread.
 *
 * ⚠️ **Why this exists at all.** The hero was a scroll listener writing inline
 * styles from React. On a desktop that is fine, because Lenis owns wheel
 * scrolling and drives the page from a main-thread rAF — the scroll offset and
 * the door positions are therefore computed in the same frame, in lockstep.
 * On a phone Lenis is deliberately off (`syncTouch: false`), so touch scrolling
 * runs on the **compositor thread** and the page moves independently of the
 * main thread. Measured on a mobile profile with a real synthesized touch
 * gesture: the page moved on 106 frames and the doors were repainted on 36 of
 * them — **they froze on 66% of the frames the page moved** — and the figure
 * was identical with and without a 4× CPU throttle, which is what proves it was
 * never a throughput problem. The page slides smoothly under doors that jump in
 * steps, and a 120Hz flagship shows it *more* clearly, not less, because it
 * presents more frames for the doors to miss. Driving the same motion from a
 * scroll timeline took the freeze rate to 6%.
 *
 * ⚠️ The numbers all come from `src/lib/heroTunnel.ts`, loaded through Vite's
 * SSR loader the way `build-sitemap.mjs` already loads `products.ts`. Never
 * hand-edit the output, and re-run this after touching that module — `npm run
 * build` does, so only a dev server can see them disagree.
 *
 * ⚠️ The output is wrapped in `@supports (animation-timeline: view())`. Where
 * that is false nothing here applies and `HeroKeyhole`'s React path drives the
 * hero exactly as it did before; the component asks the same question and stops
 * writing per-frame inline styles only when the answer is yes.
 */
import { writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const OUT = new URL('../src/styles/hero-scrub.gen.css', import.meta.url)

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const T = await server.ssrLoadModule('/src/lib/heroTunnel.ts')
await server.close()

/* Keyframe sampling. The door TRANSFORM is linear in p across the tunnel slice
   (z advances linearly and the browser does the perspective divide), so it is
   exact at 2 stops and sampling it densely would only bloat the file. Opacity
   is piecewise-linear and the swing is a cubic, so those are sampled — 60 steps
   over the whole track puts a stop every ~0.6% of scroll, which is finer than
   a 120Hz display can resolve on a 340vh track. */
const STEPS = 60
const pct = (n) => `${+(n * 100).toFixed(3)}%`
const num = (n) => String(+n.toFixed(4))

/**
 * Sample on the uniform grid, plus any mandatory knots, collapsing runs of
 * equal values so a constant stretch is two stops rather than sixty.
 *
 * ⚠️ **The knots are not an optimisation, they are correctness.** These curves
 * are smooth *within* a phase and kinked at its edges — z is flat until the
 * field starts moving at TUNNEL[0] and flat again after TUNNEL[1] — and a
 * uniform grid straddles those corners instead of landing on them, so the
 * compositor interpolates straight across the kink. Without TUNNEL[0] in the
 * list the rearmost door's fog ramped from p=0 instead of holding until the
 * field moved, and was 0.20 too bright at the corner: a door visibly lighting
 * up before anything had started. Any new curve gets its own phase edges here.
 */
function stops(fn, knots = []) {
  const grid = new Set(knots.filter((k) => k >= 0 && k <= 1))
  for (let i = 0; i <= STEPS; i++) grid.add(i / STEPS)
  const out = []
  for (const p of [...grid].sort((a, b) => a - b)) {
    const v = fn(p)
    const prev = out[out.length - 1]
    const prev2 = out[out.length - 2]
    if (prev && prev2 && prev.v === v && prev2.v === v) prev.p = p
    else out.push({ p, v })
  }
  return out
}

/**
 * A value that is piecewise-LINEAR in p needs no sampling at all: emitting its
 * breakpoints and letting the compositor interpolate is exact, not an
 * approximation. Everything driven by `seg()` is in this class, and so is the z
 * advance — the field slides forward linearly and the browser does the
 * perspective divide, so the door's transform is two stops and a straight line
 * between them. Sampling those at 60 steps instead is what made the first cut
 * of this file 62 kB; it is 12 kB emitted exactly.
 */
function exact(fn, breaks) {
  const ps = [...new Set([0, ...breaks, 1])].sort((a, b) => a - b)
  return ps.map((p) => ({ p, v: fn(p) }))
}

function keyframes(name, fn, decl, breaks, knots) {
  const body = (breaks ? exact(fn, breaks) : stops(fn, knots))
    .map((s) => `  ${pct(s.p)} { ${decl(s.v)} }`)
    .join('\n')
  return `@keyframes ${name} {\n${body}\n}`
}

/** Invert `doorZ` — at what p does door i pass through depth `zz`? Used to put
    an opacity breakpoint exactly where a clamp engages rather than near it. */
function pAtZ(i, zz, near) {
  const u = (zz + i * T.SPACING + T.GATE_DEPTH) / T.travelFor(near)
  return Math.min(1, Math.max(0, T.TUNNEL[0] + u * (T.TUNNEL[1] - T.TUNNEL[0])))
}

function fieldFor(near, offsetScale, suffix) {
  const out = []
  const n = T.TUNNEL_IDS.length
  for (let i = 0; i < n; i++) {
    const dx = T.OFFSETS[i][0] * offsetScale
    const dy = T.OFFSETS[i][1] * offsetScale
    const z = (p) => T.doorZ(i, p, near)
    /* the gate opens on progress, everything behind it on its own approach */
    const open = (p) => (i === 0 ? T.gateOpen(p) : T.doorOpen(z(p)))
    /* Every corner these curves have: the field's start and end, the gate's own
       swing window, where this door's swing begins and completes, and where the
       hall dims (which `glowAt` rides). */
    const knots = [
      T.TUNNEL[0], T.TUNNEL[1],
      T.GATE_OPEN[0], T.GATE_OPEN[1],
      /* The swing is the one genuinely non-linear curve here — an easeOutCubic
         over z −1000 → +100 — and it happens inside a p window narrow enough
         that the uniform grid only lands in it ~7 times, which left the leaf up
         to 0.76° off mid-swing. Subdividing the window is a handful of extra
         stops; a cubic is steepest at its start, so 16 even subdivisions of the
         z window is what gets the whole swing inside 0.15°. */
      ...Array.from({ length: 17 }, (_, k) => pAtZ(i, -1000 + (k * 1100) / 16, near)),
      T.WALL_IN + 0.04, 0.7,
    ]

    /* ⚠️ Transform and opacity are separate animations on purpose. The z advance
       is LINEAR in p, so the transform collapses to two stops; the opacity is a
       pair of clamped ramps and needs its own. Emitted as one keyframe set they
       could only collapse where *both* were flat, which produced 60 stops per
       door and a 62 kB stylesheet for a hero that needs 12. */
    out.push(
      keyframes(
        `kt-door-${i}${suffix}`,
        (p) => num(z(p)),
        (v) => `transform: translate(-50%, -50%) translate3d(${num(dx)}px, ${num(dy)}px, ${v}px);`,
        [T.TUNNEL[0], T.TUNNEL[1]],
      ),
      keyframes(
        `kt-fog-${i}${suffix}`,
        (p) => num(T.doorOpacity(z(p), near)),
        (v) => `opacity: ${v};`,
        [T.TUNNEL[0], T.TUNNEL[1], ...[T.FOG_IN, T.FOG_FULL, near - 220, near].map((zz) => pAtZ(i, zz, near))],
      ),
      keyframes(
        `kt-leaf-${i}${suffix}`,
        (p) => num(-open(p) * T.OPEN_DEG),
        (v) => `transform: rotateY(${v}deg);`,
        undefined,
        knots,
      ),
      keyframes(
        `kt-gap-${i}${suffix}`,
        (p) => num(open(p) * T.glowAt(p)),
        (v) => `opacity: ${v};`,
        undefined,
        knots,
      ),
      keyframes(
        `kt-shade-${i}${suffix}`,
        (p) => num(T.shadeOpacity(open(p))),
        (v) => `opacity: ${v};`,
        undefined,
        knots,
      ),
    )
  }
  return out.join('\n')
}

/**
 * Bind a selector to the hero's timeline.
 *
 * ⚠️ **Longhands, never the `animation` shorthand**, and both traps here cost a
 * round each. (1) `animation: a, b linear both` is TWO animations of which only
 * the second is `linear both`; the first takes the initial duration and fill and
 * does nothing. (2) Far worse, the shorthand resolved `animation-duration` to
 * `0s` rather than the `auto` a scroll timeline needs — so every animation was
 * instantly `finished` and `fill: both` pinned each door at its END transform,
 * i.e. the whole field parked past the camera. Both failures are silent and
 * both are invisible until React has stopped writing the same properties, which
 * is exactly when they bite. `animation-duration: auto` is what makes an
 * animation span the timeline's range; spell it out.
 */
function bind(sel, names) {
  const list = [].concat(names)
  return (
    `${sel} {\n` +
    `  animation-name: ${list.join(', ')};\n` +
    `  animation-duration: ${list.map(() => 'auto').join(', ')};\n` +
    `  animation-timing-function: linear;\n` +
    `  animation-fill-mode: both;\n` +
    `  animation-timeline: --kt-track;\n` +
    `  animation-range: contain 0% contain 100%;\n` +
    `}`
  )
}

function bindingsFor(suffix) {
  const out = []
  for (let i = 0; i < T.TUNNEL_IDS.length; i++) {
    const d = `.ktun__space > .ktun__door:nth-child(${i + 1})`
    out.push(
      bind(d, [`kt-door-${i}${suffix}`, `kt-fog-${i}${suffix}`]),
      bind(`${d} > .ktun__leaf`, `kt-leaf-${i}${suffix}`),
      bind(`${d} > .ktun__gap`, `kt-gap-${i}${suffix}`),
      bind(`${d} > .ktun__leaf > .ktun__shade`, `kt-shade-${i}${suffix}`),
    )
  }
  return out.join('\n')
}

/* The pieces that are not per-door. `.ktwall`'s opacity is here too, but its
   `content-visibility`/`inert`/`pointer-events` stay on the React path — those
   are state, not motion, and they are correct a frame late. */
const chrome = [
  keyframes('kt-hall', (p) => num(T.hallOpacity(p)), (v) => `opacity: ${v};`, [T.WALL_IN + 0.04, 0.7]),
  keyframes('kt-rays', (p) => num(T.raysOpacity(p)), (v) => `opacity: ${v};`, [0.15, 0.27]),
  keyframes('kt-copy', (p) => num(T.copyOpacity(p)), (v) => `opacity: ${v};`, [0.1, 0.2]),
  keyframes('kt-wall', (p) => num(T.wallOpacity(p)), (v) => `opacity: ${v};`, [T.WALL_IN, T.WALL_FULL]),
  keyframes('kt-lock', (p) => num(T.lockOpacity(p)), (v) => `opacity: ${v};`, [0.005, 0.05]),
].join('\n')

const chromeBindings = [
  bind('.portal--keyhole .ktun__hall', 'kt-hall'),
  bind('.portal--keyhole .portal__rays', 'kt-rays'),
  bind('.portal--keyhole .ktun__copy', 'kt-copy'),
  bind('.portal--keyhole .ktwall', 'kt-wall'),
  bind('.portal--keyhole .kgate', 'kt-lock'),
].join('\n')

const css = `/* GENERATED by \`npm run scrub:build\` — do not hand-edit.
   Source of every number: src/lib/heroTunnel.ts. See scripts/build-hero-scrub.mjs
   for why the hero is scrubbed from a scroll timeline rather than from JS. */

@supports (animation-timeline: view()) {
  /* ⚠️ The timeline is declared on the track and referenced by name from its
     descendants. \`contain 0% → contain 100%\` is, for a subject taller than the
     scrollport, exactly the range \`useTrackProgress\` measures: from the track's
     top edge at the viewport top to its bottom edge at the viewport bottom. The
     two paths therefore agree on what p means without either knowing about the
     other. */
  .portal--keyhole { view-timeline-name: --kt-track; view-timeline-axis: block; }

  /* ⚠️ Animations win over inline styles in the cascade, so these would apply
     even while React kept writing per-frame transforms. It stops writing them
     instead (see \`scrubCss\` in HeroKeyhole) — not for correctness but because
     styling elements the compositor is already driving is pure main-thread
     waste, which is the whole point of moving here. */

${chrome}

${chromeBindings}

  /* ── the field: desktop ──────────────────────────────────────────────── */
${fieldFor(T.NEAR, 1, '')}

${bindingsFor('')}

  /* ── the field: phone. A door is cut much earlier (NEAR_MOBILE) and the
     off-axis offsets are scaled in, so the whole field needs its own stops.
     ⚠️ 720px, and it must stay in step with \`useMediaQuery('(max-width: 720px)')\`
     in HeroKeyhole — the fallback path reads that one. ── */
  @media (max-width: 720px) {
${fieldFor(T.NEAR_MOBILE, T.OFFSET_SCALE_MOBILE, '-m')}

${bindingsFor('-m')}
  }

  /* Nothing scrubs when the visitor has asked for less motion — the hero
     renders its static fallback there and none of these selectors exist. */
  @media (prefers-reduced-motion: reduce) {
    .portal--keyhole { view-timeline-name: none; }
  }
}
`

writeFileSync(OUT, css)
console.log(`hero scrub → ${OUT.pathname.split('/').pop()} (${(css.length / 1024).toFixed(1)} kB)`)
