import type { CSSProperties, ReactNode } from 'react'
import type { ArtId, Tone } from '../data/products'
import { DoorArt } from './DoorArt'

/**
 * A door leaf hung in an architrave with a warm-lit room behind it.
 * `hoverOpen` swings the leaf on hover (cards); `openDeg` drives it
 * programmatically (hero). `children` render inside the doorway.
 */
export function DoorScene({
  art,
  tone,
  hoverOpen = false,
  openDeg,
  className,
  children,
  onLeafClick,
}: {
  art: ArtId
  tone: Tone
  hoverOpen?: boolean
  openDeg?: number
  className?: string
  children?: ReactNode
  onLeafClick?: () => void
}) {
  const t = openDeg !== undefined ? Math.min(1, Math.max(0, openDeg / 86)) : 0
  const leafStyle: CSSProperties =
    openDeg !== undefined
      ? {
          transform: `rotateY(${-openDeg}deg)`,
          transition: 'none',
          boxShadow: `${6 + t * 60}px ${8 + t * 8}px ${26 + t * 44}px rgba(28,20,10,${0.3 + t * 0.1})`,
          cursor: onLeafClick && t < 0.5 ? 'pointer' : 'default',
        }
      : {}
  return (
    <div className={`door-scene${hoverOpen ? ' door-scene--hover' : ''}${className ? ' ' + className : ''}`}>
      <div className="door-scene__frame" aria-hidden="true" />
      <div className="door-scene__room" aria-hidden="true">
        <div className="door-scene__room-lines" />
      </div>
      {children}
      <div className="door-scene__leaf" style={leafStyle} onClick={onLeafClick}>
        <DoorArt art={art} tone={tone} />
      </div>
    </div>
  )
}
