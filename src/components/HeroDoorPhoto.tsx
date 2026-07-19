import type { CSSProperties, ReactNode } from 'react'

/**
 * The hero door as a real photograph. Two shots of the same door
 * (Hero/ originals → images:build): hero-frame.webp is the full unit —
 * architrave, glass sidelights, closed leaf — and hero-leaf.webp is the leaf
 * cropped out of that exact shot. The leaf is overlaid on its own pixels and
 * swung with rotateY (hinge left, handle side sweeps out); a warm room plane
 * sits behind it so the doorway glows once open. `children` render inside the
 * doorway (the portal glow).
 */

/** Leaf crop box inside hero-frame.webp: (122,32) 274×604 of 520×660, template-matched. */
const LEAF_BOX: CSSProperties = {
  left: '23.462%',
  top: '4.848%',
  width: '52.692%',
  height: '91.515%',
}
/** Room plane behind the leaf: LEAF_BOX expanded a hairline (~1px) so no
 *  closed-door pixels ring the doorway; its jamb-shadow makes any peek read
 *  as the door seam (see .pdoor__aperture). */
const APERTURE: CSSProperties = {
  left: '23.25%',
  top: '4.6%',
  width: '53.1%',
  height: '92%',
}

export function HeroDoorPhoto({
  openDeg,
  onLeafClick,
  children,
}: {
  openDeg: number
  onLeafClick?: () => void
  children?: ReactNode
}) {
  const t = Math.min(1, Math.max(0, openDeg / 95))
  return (
    <div className="pdoor">
      <img
        className="pdoor__unit"
        src="/images/hero/hero-frame.webp"
        alt="Our signature main door — walnut plank leaf with a fluted charcoal panel, brass inlay and lit glass sidelights"
        width={520}
        height={660}
        fetchPriority="high"
        decoding="async"
      />
      <div className="pdoor__aperture" style={APERTURE} aria-hidden="true">
        {children}
      </div>
      <div
        className="pdoor__leaf"
        style={{
          ...LEAF_BOX,
          transform: `rotateY(${-openDeg}deg)`,
          cursor: onLeafClick && t < 0.5 ? 'pointer' : 'default',
        }}
        onClick={onLeafClick}
        aria-hidden="true"
      >
        <img src="/images/hero/hero-leaf.webp" alt="" width={274} height={604} draggable={false} />
        <span className="pdoor__shade" style={{ opacity: t * 0.85 }} />
      </div>
    </div>
  )
}
