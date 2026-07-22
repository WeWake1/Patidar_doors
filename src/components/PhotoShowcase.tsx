import type { ProductImage } from '../data/products'
import { useAjarInView } from '../lib/useAjarInView'

/**
 * Photo presentation for in-situ / room shots that would look wrong swung open.
 * The photo sits in the same architrave frame as the door cards (for grid
 * consistency) but instead of a rotateY swing it does a gentle zoom-in-frame +
 * lift on hover. Touch devices get the zoom via useAjarInView.
 */
export function PhotoShowcase({ photo, className }: { photo: ProductImage; className?: string }) {
  const ref = useAjarInView<HTMLDivElement>(true, 'photo-showcase--ajar')
  return (
    <div ref={ref} className={`photo-showcase${className ? ' ' + className : ''}`}>
      <div className="photo-showcase__frame" aria-hidden="true" />
      <div className="photo-showcase__clip">
        <img
          className="photo-showcase__img"
          src={photo.src}
          srcSet={photo.srcSet}
          sizes="(max-width: 720px) 90vw, 30vw"
          alt={photo.alt}
          width={photo.w}
          height={photo.h}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  )
}
