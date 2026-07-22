import type { Product } from '../data/products'
import { defaultToneId, getTone } from '../data/products'
import { DoorScene } from './DoorScene'
import { MaterialArt } from './MaterialArt'
import { PhotoShowcase } from './PhotoShowcase'

/**
 * The single place that maps a product's `visual` to a component — used by
 * cards, the PDP stage and the admin live preview, so all three stay in sync:
 *   art                 → SVG DoorScene (hover-swings)
 *   photo · swing       → DoorScene photo leaf (hover-swings open)
 *   photo · showcase    → PhotoShowcase (hover zoom/lift, for in-situ shots)
 *   material            → generated MaterialArt swatch
 */
export function ProductVisual({ product }: { product: Product }) {
  const visual = product.visual
  if (visual.kind === 'material') {
    return (
      <MaterialArt material={visual.material} base={visual.base} dark={visual.dark} light={visual.light} className="card__material" />
    )
  }
  if (visual.kind === 'photo') {
    if ((visual.presentation ?? 'swing') === 'showcase') {
      return <PhotoShowcase photo={visual.cover} />
    }
    return <DoorScene photo={visual.cover} hoverOpen />
  }
  return <DoorScene art={visual.art} tone={getTone(product, defaultToneId(product))} hoverOpen />
}
