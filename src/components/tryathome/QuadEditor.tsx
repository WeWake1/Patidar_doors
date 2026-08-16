/**
 * The four corners the customer drags onto the door they already have.
 *
 * This is the only layer in the try-on stage with `pointer-events`, and it is
 * deliberately *untransformed* — the warped door sits below it and is inert.
 * See DoorLayer for why hit-testing inside a 3D-transformed subtree is not an
 * option in this codebase.
 *
 * Two details carry most of the usability:
 *
 * · **The loupe.** A thumb covers the exact corner it is placing. Without a
 *   magnifier offset above the finger, nobody can be accurate, and the whole
 *   feature rests on this placement being right.
 * · **Edge handles.** Most corrections are "the whole left edge is off by a
 *   bit", not "one corner is wrong", so the four edge midpoints move their two
 *   corners together.
 *
 * Handles are real <button>s and answer to arrow keys, so this works without a
 * pointer at all.
 */

import { useCallback, useRef, useState } from 'react'
import { isConvex, shortestEdge, type Point, type Quad } from '../../lib/homography'
import { t } from '../../lib/i18n'

/** Below this the quad is unusable, however convex it still is. */
const MIN_EDGE = 24

const LOUPE = 104
const LOUPE_ZOOM = 2.4

export interface QuadEditorProps {
  quad: Quad
  onChange: (q: Quad) => void
  /** The preview box, in CSS pixels — the coordinate space `quad` lives in. */
  width: number
  height: number
  /** Photo URL, for the magnifier. */
  photoUrl: string
}

interface DragState {
  handle: number
  startQuad: Quad
  originX: number
  originY: number
  boxX: number
  boxY: number
}

export function QuadEditor({ quad, onChange, width, height, photoUrl }: QuadEditorProps) {
  const drag = useRef<DragState | null>(null)
  const [loupe, setLoupe] = useState<Point | null>(null)

  const commit = useCallback(
    (next: Quad) => {
      /* Refuse the move rather than commit it. A folded quad puts w <= 0 on a
         vertex and Chrome responds by making the door vanish outright — so a
         thumb dragged too far would blank the thing the customer is looking at.
         Keeping the last good quad is this feature's "nothing fails to a blank
         rectangle". */
      if (!isConvex(next) || shortestEdge(next) < MIN_EDGE) return
      onChange(next)
    },
    [onChange],
  )

  const moveHandle = useCallback(
    (state: DragState, dx: number, dy: number) => {
      const q = state.startQuad
      const clampX = (v: number) => Math.max(0, Math.min(width, v))
      const clampY = (v: number) => Math.max(0, Math.min(height, v))
      const shift = (p: Point): Point => ({ x: clampX(p.x + dx), y: clampY(p.y + dy) })
      const next = [...q] as unknown as Point[]
      if (state.handle < 4) {
        next[state.handle] = shift(q[state.handle])
      } else {
        // An edge handle carries both of its corners.
        const a = state.handle - 4
        const b = (a + 1) % 4
        next[a] = shift(q[a])
        next[b] = shift(q[b])
      }
      commit(next as unknown as Quad)
    },
    [commit, width, height],
  )

  const onPointerDown = (handle: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const host = e.currentTarget.parentElement
    if (!host) return
    const r = host.getBoundingClientRect()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      handle,
      startQuad: quad,
      originX: e.clientX,
      originY: e.clientY,
      boxX: r.left,
      boxY: r.top,
    }
    setLoupe({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state) return
    moveHandle(state, e.clientX - state.originX, e.clientY - state.originY)
    setLoupe({ x: e.clientX - state.boxX, y: e.clientY - state.boxY })
  }

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    drag.current = null
    setLoupe(null)
  }

  const onKeyDown = (handle: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 1
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = d[e.key]
    if (!move) return
    e.preventDefault()
    moveHandle({ handle, startQuad: quad, originX: 0, originY: 0, boxX: 0, boxY: 0 }, move[0], move[1])
  }

  const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const points = quad.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="tryq" style={{ width, height }}>
      <svg className="tryq__outline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <polygon points={points} />
      </svg>

      {quad.map((p, i) => (
        <button
          key={`c${i}`}
          type="button"
          className="tryq__handle tryq__handle--corner"
          style={{ left: p.x, top: p.y }}
          aria-label={t('try.a11y.corner', { n: i + 1 })}
          onPointerDown={onPointerDown(i)}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown(i)}
        />
      ))}

      {quad.map((p, i) => {
        const m = mid(p, quad[(i + 1) % 4])
        return (
          <button
            key={`e${i}`}
            type="button"
            className="tryq__handle tryq__handle--edge"
            style={{ left: m.x, top: m.y }}
            aria-label={t('try.a11y.edge', { n: i + 1 })}
            onPointerDown={onPointerDown(i + 4)}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown(i + 4)}
          />
        )
      })}

      {loupe && <Loupe at={loupe} photoUrl={photoUrl} width={width} height={height} />}
    </div>
  )
}

/**
 * A magnified crop under the finger, parked on whichever side of it has room.
 * Purely decorative, so it never takes pointer events.
 */
function Loupe({
  at,
  photoUrl,
  width,
  height,
}: {
  at: Point
  photoUrl: string
  width: number
  height: number
}) {
  const above = at.y > LOUPE + 24
  const top = above ? at.y - LOUPE - 20 : at.y + 20
  const left = Math.max(0, Math.min(width - LOUPE, at.x - LOUPE / 2))
  return (
    <div
      className="tryq__loupe"
      aria-hidden="true"
      style={{
        left,
        top,
        width: LOUPE,
        height: LOUPE,
        backgroundImage: `url(${photoUrl})`,
        backgroundSize: `${width * LOUPE_ZOOM}px ${height * LOUPE_ZOOM}px`,
        backgroundPosition: `${LOUPE / 2 - at.x * LOUPE_ZOOM}px ${LOUPE / 2 - at.y * LOUPE_ZOOM}px`,
      }}
    />
  )
}
