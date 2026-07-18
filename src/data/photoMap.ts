/**
 * Photo curation — which processed image (see images.gen.ts) fronts which
 * product. Covers are straight-on, full-leaf portrait shots (they get the
 * hover-open door treatment); angled and in-room shots go to PDP galleries.
 *
 * ⚠️ Several source photos carry third-party watermarks/branding (e.g.
 * main-06, main-14, main-17, main-18, main-28, main-32, main-35, room-11,
 * room-16, room-29, room-49). Those are deliberately NOT mapped — replace the
 * raw files with the client's own photography and re-run `npm run images:build`.
 */
import { DOOR_IMAGES } from './images.gen'
import type { ProductImage, Visual } from './products'

const MAP: Record<string, { cover: string; gallery?: string[] }> = {
  'burma-teak-door': { cover: 'main-04', gallery: ['main-40', 'main-42'] },
  'burma-border-teak-door': { cover: 'main-25', gallery: ['main-10'] },
  'teak-osc-2nds': { cover: 'main-41', gallery: ['main-05'] },
  'gana-teak-polish-door': { cover: 'main-09', gallery: ['main-02'] },
  'architect-teak-door': { cover: 'main-34', gallery: ['main-36', 'main-48', 'main-49'] },
  'honne-ab-door': { cover: 'main-27', gallery: ['main-33'] },
  'mahagony-ab-door': { cover: 'main-16', gallery: ['main-22'] },
  'veneer-designer-door': { cover: 'room-03', gallery: ['main-13'] },
  'veneer-cng-door': { cover: 'main-11', gallery: ['main-20', 'main-38'] },
  'laminate-cng-door': { cover: 'room-31', gallery: ['room-45'] },
  'laminate-designer-door': { cover: 'room-20', gallery: ['room-07', 'room-35'] },
  'microcoat-door': { cover: 'room-44', gallery: ['room-24'] },
  'primer-door': { cover: 'room-10', gallery: ['room-22'] },
  'korean-membrane-door': { cover: 'room-30', gallery: ['room-39', 'room-28'] },
  'membrane-door': { cover: 'room-33', gallery: ['room-50', 'room-38', 'room-05'] },
  'wpc-cnc-door': { cover: 'room-25', gallery: ['room-23'] },
  'wpc-digital-veneer-door': { cover: 'main-03', gallery: ['main-39'] },
}

function toImage(id: string, alt: string): ProductImage | undefined {
  const img = DOOR_IMAGES[id]
  if (!img) return undefined
  return { src: img.src, srcSet: img.srcSet, w: img.w, h: img.h, alt }
}

/** Photo visual for a product, if a cover has been curated for it. */
export function photoVisualFor(productId: string, name: string): Visual | undefined {
  const m = MAP[productId]
  if (!m) return undefined
  const cover = toImage(m.cover, name)
  if (!cover) return undefined
  const gallery = (m.gallery ?? []).flatMap((id) => {
    const g = toImage(id, name)
    return g ? [g] : []
  })
  return { kind: 'photo', cover, gallery }
}
