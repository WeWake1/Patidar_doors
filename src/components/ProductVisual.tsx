import type { Product } from '../data/products'
import { defaultToneId, getTone } from '../data/products'
import { DoorScene } from './DoorScene'
import { MaterialArt } from './MaterialArt'
import { PhotoShowcase } from './PhotoShowcase'
import { ProductPhoto } from './ProductPhoto'

/**
 * The single place that maps a product's `visual` to a component — used by
 * cards, the PDP stage and the admin live preview, so all three stay in sync:
 *   art                 → SVG DoorScene (hover-swings)
 *   photo · swing       → DoorScene photo leaf (hover-swings open)
 *   photo · showcase    → PhotoShowcase (hover zoom/lift, for in-situ shots)
 *   photo · still       → PhotoShowcase, motion off (same frame, no animation)
 *   photo · plain       → a picture, full-bleed — no frame, no motion
 *   material            → generated MaterialArt swatch
 */
export function ProductVisual({ product }: { product: Product }) {
  const visual = product.visual
  if (visual.kind === 'material') {
    return (
      <MaterialArt
        material={visual.material}
        base={visual.base}
        dark={visual.dark}
        light={visual.light}
        /* The swatch is drawn, not photographed, so without a seed every board
           of the same species comes out of the same mould — four teak cards
           side by side were pixel-identical and read as a loading state. */
        seed={product.id}
        className="card__material"
      />
    )
  }
  if (visual.kind === 'photo') {
    const presentation = visual.presentation ?? 'swing'
    /* Not a door, so not a door frame. `plain` takes the same full-bleed 4:3
       box as the drawn swatch beside it on /timbers and /ply — the other three
       treatments all keep the architrave, which is exactly what made a stack of
       teak logs read as a door. Set by `buildCatalogue`, never by the CMS. */
    if (presentation === 'plain') {
      return (
        <div className="photo-plain">
          <ProductPhoto photo={visual.cover} className="photo-plain__img" />
        </div>
      )
    }
    if (presentation === 'showcase' || presentation === 'still') {
      return <PhotoShowcase photo={visual.cover} still={presentation === 'still'} />
    }
    return <DoorScene photo={visual.cover} hoverOpen />
  }
  return <DoorScene art={visual.art} tone={getTone(product, defaultToneId(product))} hoverOpen />
}
