/**
 * The customer's chosen door, warped onto the four corners they placed.
 *
 * The whole layer is a live <DoorArt> under one CSS `matrix3d` — nothing is
 * rasterised in the interactive loop, so the leaf stays vector while a corner
 * is being dragged, and switching finish or design is a plain React re-render
 * under an unchanged transform.
 *
 * ⚠️ `pointer-events: none`, always. This repo has already been bitten once by
 * hit-testing inside a 3D-transformed subtree — the Door Wall's tiles had to
 * become `transform-style: flat` because Chrome resolved `elementFromPoint` to
 * the track and half the clicks vanished. The corner handles therefore live in
 * a separate, *untransformed* layer above this one (see QuadEditor); nothing
 * ever tries to hit-test the warped surface.
 *
 * ⚠️ The <DoorArt> subtree is memoised away from the transform. The quad
 * changes on every pointermove — that is the point of it — but behind it sit
 * ~180 static SVG nodes, and reconciling those 60×/sec to move their
 * grandparent is exactly the cost the hero corridor's WorldCardInner exists to
 * avoid. Only the wrapper's inline style is allowed to change during a drag.
 */

import { memo, useMemo } from 'react'
import type { ArtId, Tone } from '../../data/products'
import { gradeFor } from '../../lib/doorGrade'
import { rectQuad, solveHomography, toMatrix3d, type Mat3, type Quad } from '../../lib/homography'
import type { Ambient } from '../../lib/photoLoad'
import { DoorArt } from '../DoorArt'

/**
 * The pixel height the leaf is *laid out* at before the warp scales it.
 *
 * Quantised to three rungs rather than tracking the quad, because the source
 * box's size is a memoisation input: let it follow the drag and the SVG — with
 * its feTurbulence grain filter — re-rasterises on every single frame. Crossing
 * a rung mid-drag is rare and costs one repaint.
 */
function sourceHeight(quadHeightPx: number): number {
  return quadHeightPx < 700 ? 600 : quadHeightPx < 1100 ? 900 : 1400
}

export interface DoorLayerProps {
  art: ArtId
  tone: Tone
  /** Where the door goes, in the preview box's own pixels. */
  quad: Quad
  heightIn: number
  widthIn: number
  /** Hinge on the other side — negated into the source rect, not a 2nd transform. */
  flipped?: boolean
  /** Room light sampled from around the quad; null just means no grading. */
  ambient?: Ambient | null
}

export function DoorLayer({ art, tone, quad, heightIn, widthIn, flipped, ambient }: DoorLayerProps) {
  const geom = useMemo(() => {
    const edge = (a: number, b: number) => Math.hypot(quad[b].x - quad[a].x, quad[b].y - quad[a].y)
    const quadH = (edge(0, 3) + edge(1, 2)) / 2
    const h = sourceHeight(quadH)
    // The source box carries the *real* door's proportions, so an 84×33 leaf
    // warps as an 84:33 rectangle. This is what makes the preview honest
    // rather than decorative.
    const w = h * (widthIn / heightIn)
    const src = rectQuad(w, h)
    const from: Quad = flipped
      ? [{ x: w, y: 0 }, { x: 0, y: 0 }, { x: 0, y: h }, { x: w, y: h }]
      : src
    return { w, h, m: solveHomography(from, quad) }
  }, [quad, heightIn, widthIn, flipped])

  // A null solve means the quad folded. The editor refuses those moves before
  // they land, so this is belt-and-braces — but rendering nothing beats
  // rendering an element the browser has decided to make invisible.
  if (!geom.m) return null

  return (
    <>
      <ContactShadow m={geom.m} w={geom.w} h={geom.h} />
      <div
        className="tryd"
        aria-hidden="true"
        style={{ width: geom.w, height: geom.h, transform: toMatrix3d(geom.m) }}
      >
        <DoorInner art={art} tone={tone} ambient={ambient ?? null} />
      </div>
    </>
  )
}

/**
 * The one thing that stops a composite reading as a sticker: the door has to
 * touch the floor. A gradient multiplied over the photograph just below the
 * leaf costs nothing and buys more perceived realism than the warp accuracy
 * does.
 *
 * `mix-blend-mode` sits on the transformed element itself, not on a child —
 * a transform creates a stacking context, so a child would blend against its
 * own parent instead of against the photograph.
 */
function ContactShadow({ m, w, h }: { m: Mat3; w: number; h: number }) {
  return (
    <div
      className="tryd__contact"
      aria-hidden="true"
      style={{ width: w, height: h * 1.06, transform: toMatrix3d(m) }}
    />
  )
}

const DoorInner = memo(function DoorInner({
  art,
  tone,
  ambient,
}: {
  art: ArtId
  tone: Tone
  ambient: Ambient | null
}) {
  const grade = cssGrade(ambient)
  return (
    <div className="tryd__grade" style={{ filter: grade.filter }}>
      <DoorArt art={art} tone={tone} className="tryd__art" />
      {grade.tint && <div className="tryd__tint" style={grade.tint} />}
      {grade.fall && <div className="tryd__fall" style={grade.fall} />}
    </div>
  )
})

/**
 * The numbers come from `src/lib/doorGrade.ts`, which the exporter reads too —
 * this function only dresses them as CSS. Keeping one source for the arithmetic
 * is what guarantees the saved picture matches the approved one.
 */
function cssGrade(a: Ambient | null): {
  filter?: string
  tint?: { background: string; opacity: number }
  fall?: { background: string }
} {
  const g = gradeFor(a)
  if (!a) return {}
  const filter = `brightness(${g.brightness.toFixed(3)})`
  const tint = g.tint
    ? { background: `rgb(${g.tint.r},${g.tint.g},${g.tint.b})`, opacity: g.tint.a }
    : undefined
  // Shading lives inside the warped box, so it follows the perspective too.
  // The stops mirror falloffAt(): nothing until 40%, then a linear ramp.
  const peak = (Math.abs(g.falloff) * 0.5).toFixed(3)
  const fall =
    g.falloff === 0
      ? undefined
      : {
          background:
            g.falloff > 0
              ? `linear-gradient(to bottom, rgb(0 0 0 / 0) 40%, rgb(0 0 0 / ${peak}))`
              : `linear-gradient(to top, rgb(0 0 0 / 0) 40%, rgb(0 0 0 / ${peak}))`,
        }
  return { filter, tint, fall }
}
