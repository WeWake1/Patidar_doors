import type { ArtId, ProductImage, Tone } from '../data/products'
import { useAjarInView } from '../lib/useAjarInView'
import { DoorArt } from './DoorArt'
import GlareHover from './reactbits/GlareHover'

/**
 * A door leaf hung in an architrave with a warm-lit room behind it.
 * The leaf is either SVG artwork (`art` + `tone`) or a real photograph
 * (`photo`) — photos get a gentler hover swing (see .door-scene--photo).
 * `hoverOpen` swings the leaf on hover (cards); touch devices get the ajar
 * treatment via useAjarInView. (The scroll-driven hero door is HeroDoorPhoto.)
 */
export function DoorScene({
  art,
  tone,
  photo,
  hoverOpen = false,
  className,
}: {
  art?: ArtId
  tone?: Tone
  photo?: ProductImage
  hoverOpen?: boolean
  className?: string
}) {
  const classes = [
    'door-scene',
    hoverOpen ? 'door-scene--hover' : '',
    photo ? 'door-scene--photo' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const ajarRef = useAjarInView<HTMLDivElement>(hoverOpen)
  return (
    <div ref={ajarRef} className={classes}>
      <div className="door-scene__frame" aria-hidden="true" />
      <div className="door-scene__room" aria-hidden="true">
        <div className="door-scene__room-lines" />
      </div>
      <div className="door-scene__leaf">
        {photo ? (
          <img
            className="door-scene__photo"
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="(max-width: 720px) 90vw, 30vw"
            alt={photo.alt}
            width={photo.w}
            height={photo.h}
            loading="lazy"
            decoding="async"
          />
        ) : (
          art && tone && <DoorArt art={art} tone={tone} />
        )}
        {/* Glare sweep across the leaf as it swings — reactbits GlareHover,
            driven by the door-scene hover/ajar state (see .door-scene__glare). */}
        {hoverOpen && (
          <GlareHover
            className="door-scene__glare"
            width="100%"
            height="100%"
            background="transparent"
            borderColor="transparent"
            borderRadius="0"
            glareColor="#f6ecd2"
            glareOpacity={0.6}
            glareAngle={-30}
            glareSize={260}
            transitionDuration={900}
          />
        )}
      </div>
    </div>
  )
}
