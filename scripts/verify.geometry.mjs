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

  /* ── mirroring: the cropper's left-to-right flip ──────────
     Every door on the site swings from its left edge, so a right-hinged photo
     has to be mirrored on the way into the catalogue. The mirror is two quad
     rearrangements rather than a second pass over the pixels, and both of them
     are the kind of index juggling that is wrong-but-plausible — hence these. */
  const { mirrorQuad, flipWinding, squareUp } = await server.ssrLoadModule('/src/lib/rectifyImage.ts')

  const close = (a, b) => Math.abs(a - b) < 1e-9
  const door = [
    { x: 0.3, y: 0.1 },
    { x: 0.68, y: 0.16 },
    { x: 0.71, y: 0.92 },
    { x: 0.27, y: 0.88 },
  ]
  const sameQuad = (a, b) => a.every((p, i) => close(p.x, b[i].x) && close(p.y, b[i].y))
  const winding = (p) =>
    Math.sign((p[1].x - p[0].x) * (p[2].y - p[1].y) - (p[1].y - p[0].y) * (p[2].x - p[1].x))

  // An involution, which is what lets one call convert in both directions —
  // handles out to the editor, and the owner's drag back into photo space.
  ok('mirrorQuad twice is the identity', sameQuad(mirrorQuad(mirrorQuad(door, 1), 1), door))

  const shown = mirrorQuad(door, 1)
  ok('a mirrored quad is still convex', isConvex(shown))
  /* Reflection alone reverses the winding, which would leave the editor and
     squareUp indexing the corner roles back-to-front — the paired flipWinding
     is what puts index 0 back at the top-left of what the owner sees. */
  ok('mirrorQuad preserves the winding', winding(shown) === winding(door))
  ok(
    'index 0 is still the top-left corner on screen',
    shown[0].y < shown[3].y && shown[0].x < shown[1].x && close(shown[0].x, 1 - door[1].x),
  )

  const upright = rectQuad(1, 1)
  const nudged = [{ x: 0.3, y: 0 }, ...upright.slice(1)]
  ok("squareUp's shared-edge tables survive the mirror", close(squareUp(nudged, upright)[3].x, 0.3))

  /* And the export half: reversed corners fed to the rectifier's own solve.
     Output (0,0) maps to quad[0], so handing it the top-*right* corner first
     walks the leaf out backwards — a mirror for no extra pixel work. */
  const flat = rectQuad(100, 200)
  const plain = solveHomography(rectQuad(100, 200), flat)
  const mirrored = solveHomography(rectQuad(100, 200), flipWinding(flat))
  const straight = mapPoint(plain, 10, 20)
  const flipped = mapPoint(mirrored, 10, 20)
  ok('unflipped, output x=10 samples source x=10', close(straight.x, 10) && close(straight.y, 20))
  ok('flipped, output x=10 samples source x=90', close(flipped.x, 90) && close(flipped.y, 20))

  const tilted = project(33, 84, 0.05, 0.3, 300, 1500)
  const reverse = solveHomography(rectQuad(100, 200), flipWinding(tilted))
  ok('a perspective quad still solves wound the other way', reverse !== null)
  const origin = reverse && mapPoint(reverse, 0, 0)
  ok(
    "flipped, the output's top-left comes off the door's top-right",
    !!origin && close(origin.x, tilted[1].x) && close(origin.y, tilted[1].y),
    JSON.stringify(origin),
  )
  ok(
    'mirroring does not change the measured shape',
    close(rectifyAspect(tilted, IMG_W, IMG_H).ratio, rectifyAspect(flipWinding(tilted), IMG_W, IMG_H).ratio),
  )

  /* ── handheld AR: the model matrix ───────────────────── */

  /* The AR path draws with hand-written WebGL rather than three.js, so nothing
     else is checking these conventions. A transposed multiply or a swapped
     atan2 still renders a door — just in the wrong place, at the wrong angle,
     on hardware that cannot be put in CI. So the arithmetic is pinned here,
     where there is ground truth, exactly like the rectifier above. */
  const { mul, uprightQuad, yawToward } = await server.ssrLoadModule('/src/lib/arScene.ts')

  /* These matrices are Float32Array, because that is what WebGL and WebXR both
     hand over — so the 1e-9 epsilon above (float64 pixel maths) is far tighter
     than the representation. 1e-5 of a metre is a hundredth of a millimetre,
     which is well past anything a door cares about. */
  const close32 = (a, b) => Math.abs(a - b) < 1e-5

  const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const M = new Float32Array(16)

  const sample = new Float32Array([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53])
  ok(
    'mul by identity is the identity',
    [...mul(new Float32Array(16), sample, IDENT)].every((v, i) => close32(v, sample[i])) &&
      [...mul(new Float32Array(16), IDENT, sample)].every((v, i) => close32(v, sample[i])),
  )

  /* Apply a column-major M to a column vector, the way the shader does. */
  const apply = (m, x, y, z) => ({
    x: m[0] * x + m[4] * y + m[8] * z + m[12],
    y: m[1] * x + m[5] * y + m[9] * z + m[13],
    z: m[2] * x + m[6] * y + m[10] * z + m[14],
  })

  // An 84″ × 33″ leaf, in metres, standing with its base on the origin.
  const halfH = (84 * 0.0254) / 2
  const halfW = (33 * 0.0254) / 2
  uprightQuad(M, 0, halfH, 0, 0, halfW, halfH)

  const topRight = apply(M, 1, 1, 0)
  const bottomLeft = apply(M, -1, -1, 0)
  ok(
    'the leaf is placed at its true size in metres',
    close32(topRight.x - bottomLeft.x, 33 * 0.0254) && close32(topRight.y - bottomLeft.y, 84 * 0.0254),
    `${topRight.x - bottomLeft.x}m × ${topRight.y - bottomLeft.y}m`,
  )
  ok('the leaf stands on the surface it was placed on', close32(bottomLeft.y, 0), String(bottomLeft.y))

  /* The design decision this pins: a hit on the *floor* comes back with its
     normal pointing up, and taking that orientation would lay the door flat on
     the carpet. The leaf is upright always, whatever it was placed on. */
  let laidFlat = false
  for (const yaw of [0, 0.4, 1.2, Math.PI / 2, 2.9, -1.1]) {
    uprightQuad(M, 1.5, halfH, -2, yaw, halfW, halfH)
    const up = apply(M, 0, 1, 0)
    const base = apply(M, 0, 0, 0)
    if (!close32(up.x - base.x, 0) || !close32(up.z - base.z, 0) || !close32(up.y - base.y, halfH)) laidFlat = true
  }
  ok('the leaf is vertical at every yaw, never lying flat', !laidFlat)

  /* Facing the viewer is the only orientation a placed door can have — it is a
     plane, so a wrong yaw is not a subtle error. */
  let facing = true
  for (const [cx, cz] of [
    [3, 4],
    [-2, 5],
    [0, -6],
    [7, 0],
  ]) {
    const yaw = yawToward(cx, cz, 0, 0)
    uprightQuad(M, 0, halfH, 0, yaw, halfW, halfH)
    // Local +z is the face; compare its world direction to door → camera.
    const face = apply(M, 0, 0, 1)
    const base = apply(M, 0, 0, 0)
    const nx = face.x - base.x
    const nz = face.z - base.z
    const len = Math.hypot(cx, cz)
    if (!close32(nx, cx / len) || !close32(nz, cz / len)) facing = false
  }
  ok('a placed leaf faces whoever placed it', facing)
} finally {
  await server.close()
}

console.log(failures ? `\n${failures} FAILED` : '\nALL GEOMETRY CHECKS PASSED')
process.exit(failures ? 1 : 0)
