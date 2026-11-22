import type { ProductImage } from '../data/products'
import { useAjarInView } from '../lib/useAjarInView'
import { ProductPhoto } from './ProductPhoto'

/**
 * Photo presentation for in-situ / room shots that would look wrong swung open.
 * The photo sits in the same architrave frame as the door cards (for grid
 * consistency) but instead of a rotateY swing it does a gentle zoom-in-frame +
 * lift on hover. Touch devices get the zoom via useAjarInView.
 *
 * `still` is the third card animation: the same frame, no motion at all. The
 * observer is not just ignored but never attached, so a still card costs
 * nothing on scroll.
 */
export function PhotoShowcase({
  photo,
  className,
  still,
}: {
  photo: ProductImage
  className?: string
  still?: boolean
}) {
  const ref = useAjarInView<HTMLDivElement>(!still, 'photo-showcase--ajar')
  return (
    <div
      ref={ref}
      className={`photo-showcase${still ? ' photo-showcase--still' : ''}${className ? ' ' + className : ''}`}
    >
      <div className="photo-showcase__frame" aria-hidden="true" />
      <div className="photo-showcase__clip">
        <ProductPhoto photo={photo} className="photo-showcase__img" />
      </div>
    </div>
  )
}
