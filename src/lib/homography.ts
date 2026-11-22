/**
 * Projective (perspective) mapping between two quadrilaterals.
 *
 * This is the whole geometric core of "see it in your doorway". A customer
 * drags four corners onto the door they already have; we solve the homography
 * that carries our upright door rectangle onto those four points, and hand it
 * to CSS as a `matrix3d()`.
 *
 * Why CSS and not canvas or WebGL: canvas 2D's transform is *affine* — six
 * degrees of freedom — and cannot map a rectangle to a trapezoid at all, so it
 * is not a worse option here but an impossible one. A CSS 3D transform, on the
 * other hand, IS a projective map, which makes `matrix3d` an exact warp for
 * zero bytes, zero per-frame JS and no GL context — and it warps the live
 * <DoorArt> SVG, so the preview stays vector and switching finish or design
 * costs nothing. The export path (src/lib/compose.ts) inverts the same matrix
 * and samples on the CPU; nothing in this feature needs three.js.
 *
 * Pure: no DOM, no imports, no allocation beyond the results.
 */

export interface Point {
  x: number
  y: number
}

/**
 * Four corners, **clockwise from the top-left**. The editor's handles, the
 * solve and the rectifier all index into that order, so a quad wound the other
 * way doesn't error — it silently produces a mirrored door.
 */
export type Quad = readonly [Point, Point, Point, Point]

/** Row-major 3×3: `[h11 h12 h13 h21 h22 h23 h31 h32 h33]`. */
export type Mat3 = number[]

/**
 * The homography carrying `src` onto `dst`, or null if the four points are
 * degenerate (coincident, or three of them collinear).
 *
 * Null is a real answer and callers must honour it: the editor keeps the last
 * good matrix rather than committing one that would blank the door. Dragging a
 * corner past a crossing point is a normal thing for a thumb to do.
 */
export function solveHomography(src: Quad, dst: Quad): Mat3 | null {
  /* Eight unknowns — h33 is pinned to 1. A homography is only defined up to
     scale, and h33 can vanish only for a map that sends the origin to
     infinity, which a convex on-screen quad cannot ask for. */
  const rows: number[][] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]
    const { x: X, y: Y } = dst[i]
    rows.push([x, y, 1, 0, 0, 0, -x * X, -y * X, X])
    rows.push([0, 0, 0, x, y, 1, -x * Y, -y * Y, Y])
  }
  const h = solve8(rows)
  if (!h) return null
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

/** Gauss–Jordan with partial pivoting on an 8×9 augmented matrix. */
function solve8(m: number[][]): number[] | null {
  const n = 8
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    }
    if (Math.abs(m[pivot][col]) < 1e-10) return null
    if (pivot !== col) {
      const swap = m[pivot]
      m[pivot] = m[col]
      m[col] = swap
    }
    const p = m[col]
    const inv = 1 / p[col]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = m[r][col] * inv
      if (f === 0) continue
      for (let c = col; c <= n; c++) m[r][c] -= f * p[c]
    }
  }
  const out: number[] = []
  for (let r = 0; r < n; r++) {
    const v = m[r][n] / m[r][r]
    if (!Number.isFinite(v)) return null
    out.push(v)
  }
  return out
}

/**
 * A CSS `matrix3d()` for the same map.
 *
 * ⚠️ The element **must** carry `transform-origin: 0 0`, or the solve is off by
 * half the box — the matrix maps the border box's own coordinates, which start
 * at its top-left corner, not its centre.
 *
 * matrix3d() is column-major: rows 1 and 2 of the 4×4 produce X and Y and row 4
 * produces W, so a 2D homography drops straight in with z left alone (m33 = 1)
 * and h31/h32/h33 landing in the w row.
 */
export function toMatrix3d(h: Mat3): string {
  const v = [
    h[0], h[3], 0, h[6],
    h[1], h[4], 0, h[7],
    0, 0, 1, 0,
    h[2], h[5], 0, h[8],
  ]
  return `matrix3d(${v.map(fx).join(',')})`
}

/**
 * ⚠️ CSS `<number>` has **no exponential notation**. The w-row terms are
 * routinely around 1e-5, and `String(1e-5)` is `"0.00001"` but `String(1e-7)`
 * is `"1e-7"` — which makes the whole `matrix3d()` invalid, so the browser
 * drops the entire transform and the door snaps back to an unwarped rectangle
 * on top of the photo. Fixed notation always; 10 places is far below a pixel
 * once multiplied through.
 */
function fx(v: number): string {
  return Number.isFinite(v) ? v.toFixed(10) : '0'
}

/** The inverse map, or null if `h` is singular. Used by the export sampler. */
export function invert(h: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, i, j] = h
  const A = e * j - f * i
  const B = f * g - d * j
  const C = d * i - e * g
  const det = a * A + b * B + c * C
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null
  const s = 1 / det
  return [
    A * s, (c * i - b * j) * s, (b * f - c * e) * s,
    B * s, (a * j - c * g) * s, (c * d - a * f) * s,
    C * s, (b * g - a * i) * s, (a * e - b * d) * s,
  ]
}

/** Apply `h` to a point, with the perspective divide. */
export function mapPoint(h: Mat3, x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8]
  return {
    x: (h[0] * x + h[1] * y + h[2]) / w,
    y: (h[3] * x + h[4] * y + h[5]) / w,
  }
}

/**
 * True while the quad is still a simple, unfolded shape.
 *
 * Both windings pass — the caller cares only that a thumb hasn't dragged one
 * corner across the far edge. That matters more than it sounds: a folded quad
 * puts `w <= 0` on some vertex, and Chrome responds by making the element
 * vanish outright. Guarding here is this feature's version of the house rule
 * that nothing fails to a blank rectangle.
 */
export function isConvex(q: Quad): boolean {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    const c = q[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-6) return false // three corners in a line
    const s = cross > 0 ? 1 : -1
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

/** The shortest edge, in the quad's own units. The editor uses it as a floor. */
export function shortestEdge(q: Quad): number {
  let min = Infinity
  for (let i = 0; i < 4; i++) {
    const a = q[i]
    const b = q[(i + 1) % 4]
    min = Math.min(min, Math.hypot(b.x - a.x, b.y - a.y))
  }
  return min
}

/** The upright rectangle `0,0 → w,h`, clockwise from the top-left. */
export function rectQuad(w: number, h: number): Quad {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ]
}
