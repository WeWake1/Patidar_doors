/**
 * Unit checks for the try-at-home geometry — the pure maths behind
 * "see it in your doorway".
 *
 * This is separate from verify.e2e.mjs on purpose. That script proves the
 * *feature* works in a browser; this one proves the *arithmetic* is right,
 * which a browser test cannot do because it has no ground truth to compare
 * against. Here we build a synthetic camera, photograph a rectangle of known
 * size with it, and check we get that size back.
 *
 * Modules are loaded through Vite's SSR loader rather than imported directly,
 * for the same reason build-sitemap.mjs does it: the source uses extensionless
 * TypeScript imports that bare Node will not resolve.
 *
 * Run with `npm run verify:geometry`. Exits non-zero on any failure.
 */
import { createServer } from 'vite'

const root = new URL('..', import.meta.url).pathname
const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true } })

let failures = 0
const ok = (label, cond, detail = '') => {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${label}${cond ? '' : ` — ${detail}`}`)
  if (!cond) failures++
}

try {
  const { solveHomography, toMatrix3d, invert, mapPoint, isConvex, rectQuad } =
    await server.ssrLoadModule('/src/lib/homography.ts')
  const { rectifyAspect, sizeFromHeight } = await server.ssrLoadModule('/src/lib/rectify.ts')

  /* ── homography ──────────────────────────────────────── */

  const src = rectQuad(300, 800)
  const dst = [
    { x: 120, y: 90 },
    { x: 430, y: 140 },
    { x: 415, y: 760 },
    { x: 135, y: 700 },
  ]
  const H = solveHomography(src, dst)
  ok('homography solves', H !== null)

  let worst = 0
  for (let i = 0; i < 4; i++) {
    const p = mapPoint(H, src[i].x, src[i].y)
    worst = Math.max(worst, Math.hypot(p.x - dst[i].x, p.y - dst[i].y))
  }
  ok('every corner maps exactly', worst < 1e-8, `worst ${worst}`)

  const Hi = invert(H)
  const mid = mapPoint(H, 150, 400)
  const back = mapPoint(Hi, mid.x, mid.y)
  ok(
    'the inverse round-trips an interior point',
    Math.abs(back.x - 150) < 1e-6 && Math.abs(back.y - 400) < 1e-6,
    `${back.x}, ${back.y}`,
  )

  const m3 = toMatrix3d(H)
  const args = m3.slice('matrix3d('.length, -1).split(',')
  ok('matrix3d has 16 arguments', args.length === 16, `${args.length}`)
  /* ⚠️ CSS <number> has no exponential notation. The w-row terms sit around
     1e-5, and one "1e-7" invalidates the whole matrix3d — the browser then
     drops the transform silently and the door snaps back to a flat rectangle. */
  ok('matrix3d never uses exponential notation', !/e[+-]/i.test(m3), m3)
  ok(
    'every matrix3d argument is a plain decimal',
    args.every((a) => /^-?\d+\.\d+$/.test(a.trim())),
    m3,
  )

  // Column-major check, derived independently of toMatrix3d.
  const n = args.map(Number)
  const X = (x, y) => (n[0] * x + n[4] * y + n[12]) / (n[3] * x + n[7] * y + n[15])
  const Y = (x, y) => (n[1] * x + n[5] * y + n[13]) / (n[3] * x + n[7] * y + n[15])
  let worst2 = 0
  for (let i = 0; i < 4; i++) {
    worst2 = Math.max(worst2, Math.hypot(X(src[i].x, src[i].y) - dst[i].x, Y(src[i].x, src[i].y) - dst[i].y))
  }
  ok('the matrix3d layout reproduces the mapping', worst2 < 1e-3, `worst ${worst2}`)

  ok(
    'a degenerate outline returns null, not a blanking matrix',
    solveHomography(src, [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ]) === null,
  )

  /* A folded quad puts w <= 0 on a vertex and Chrome makes the element vanish
     outright, so the editor refuses those moves. */
  ok('a bow-tie quad is rejected', !isConvex([
    { x: 0, y: 0 },
    { x: 300, y: 0 },
    { x: 0, y: 800 },
    { x: 300, y: 800 },
  ]))
  ok('a plain rectangle is convex', isConvex(rectQuad(300, 800)))
  ok('the other winding is convex too', isConvex([
    { x: 0, y: 0 },
    { x: 0, y: 800 },
    { x: 300, y: 800 },
    { x: 300, y: 0 },
  ]))

  /* ── rectification: photograph a known door, measure it back ── */

  const IMG_W = 1200
  const IMG_H = 1600

  /** Project a W×H rectangle rotated by (rx, ry), at depth tz, focal f. */
  const project = (W, Hgt, rx, ry, tz, f) => {
    const cx = Math.cos(rx)
    const sx = Math.sin(rx)
    const cy = Math.cos(ry)
    const sy = Math.sin(ry)
    const R = [
      [cy, 0, sy],
      [sx * sy, cx, -sx * cy],
      [-cx * sy, sx, cx * cy],
    ]
    return [
      [0, 0],
      [W, 0],
      [W, Hgt],
      [0, Hgt],
    ].map(([x0, y0]) => {
      const x = x0 - W / 2
      const y = y0 - Hgt / 2
      const Xc = R[0][0] * x + R[0][1] * y
      const Yc = R[1][0] * x + R[1][1] * y
      const Zc = R[2][0] * x + R[2][1] * y + tz
      return { x: (f * Xc) / Zc + IMG_W / 2, y: (f * Yc) / Zc + IMG_H / 2 }
    })
  }

  const cases = [
    ['strong yaw', 0.05, 0.44, 260, 1500],
    ['moderate yaw', 0.03, 0.26, 300, 1500],
    ['yaw and pitch', 0.22, 0.34, 280, 1400],
    ['looking up at it', 0.35, 0.12, 240, 1600],
    ['wide lens, close in', 0.1, 0.38, 170, 900],
    ['long lens, far off', 0.06, 0.3, 700, 2600],
  ]

  const W = 33
  const Hgt = 84
  const truth = W / Hgt

  for (const [label, rx, ry, tz, f] of cases) {
    const r = rectifyAspect(project(W, Hgt, rx, ry, tz, f), IMG_W, IMG_H)
    if (!r) {
      ok(`${label}: recovers the door's shape`, false, 'returned null')
      continue
    }
    const err = Math.abs(r.ratio - truth) / truth
    const size = sizeFromHeight(r.ratio, 84, {
      height: { min: 60, max: 96 },
      width: { min: 20, max: 48 },
      step: 0.25,
    })
    ok(
      `${label}: 33″×84″ door reads back as ${size.widthIn}″×${size.heightIn}″ (${(err * 100).toFixed(2)}%)`,
      err < 0.03 && r.fromPerspective,
      `error ${(err * 100).toFixed(1)}%, fromPerspective=${r.fromPerspective}`,
    )
  }

  /* A dead-on shot leaves perspective with nothing to say. Falling back to the
     outline's shape in the image is not a failure there — it is the right
     answer, and the two branches agree at the boundary rather than jumping. */
  const frontal = rectifyAspect(project(W, Hgt, 0, 0, 400, 1500), IMG_W, IMG_H)
  ok('a frontal shot falls back instead of guessing', frontal !== null && !frontal.fromPerspective)
  ok(
    'the frontal fallback is still the right shape',
    frontal !== null && Math.abs(frontal.ratio - truth) / truth < 0.01,
    `${frontal?.ratio}`,
  )

  const wide = rectifyAspect(project(48, 96, 0.08, 0.36, 300, 1500), IMG_W, IMG_H)
  ok(
    'a 4ft × 8ft leaf recovers too (the ratio is not pinned)',
    wide !== null && Math.abs(wide.ratio - 0.5) / 0.5 < 0.03,
    `${wide?.ratio}`,
  )

  ok(
    'a collinear outline returns null',
    rectifyAspect(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 20, y: 20 },
        { x: 30, y: 30 },
      ],
      IMG_W,
      IMG_H,
    ) === null,
  )

  const limits = { height: { min: 60, max: 96 }, width: { min: 20, max: 48 }, step: 0.25 }
  ok('sizes land on the quarter-inch the sliders use', sizeFromHeight(0.3929, 84, limits).widthIn % 0.25 === 0)
  ok('an absurd ratio clamps to what we sell', sizeFromHeight(5, 84, limits).widthIn === 48)
} finally {
  await server.close()
}

console.log(failures ? `\n${failures} FAILED` : '\nALL GEOMETRY CHECKS PASSED')
process.exit(failures ? 1 : 0)
