/**
 * Photo curation — which processed image (see images.gen.ts) fronts which
 * product, and where inside that photograph the door leaf actually is.
 *
 * Covers are straight-on, full-leaf portrait shots (they get the hover-open
 * door treatment); angled and in-room shots go to PDP galleries.
 *
 * ⚠️ Several source photos carry third-party watermarks/branding (e.g.
 * main-06, main-14, main-17, main-18, main-28, main-32, main-35, room-11,
 * room-16, room-29, room-49). Those are deliberately NOT mapped — replace the
 * raw files with the client's own photography and re-run `npm run images:build`.
 */
import { DOOR_IMAGES } from './images.gen'
import { LEAF_IMAGES } from './leaves.gen'
import type { ProductImage, Visual } from './products'

/**
 * Where the leaf is in the photograph, as fractions of the image's own width
 * and height, **clockwise from the top-left corner of the door** — the same
 * winding `rectifyToCanvas` and the admin's cropper use.
 *
 * ⚠️ These are the four corners of the *leaf*, not of the doorway and not of
 * the architrave: the frame, the reveal shadow and the floor line all stay out
 * of the crop. `npm run leaves:build` maps this quad back to a true rectangle,
 * which removes the camera's tilt and the room in one operation, and writes
 * the result to leaves.gen.ts. That rectangle is the only thing "see it in
 * your doorway" can honestly warp into a customer's photo.
 *
 * They are hand-marked because there is nothing to detect them with: the raw
 * photography is gitignored and never reaches this machine, and a detector
 * that is right 60% of the time would silently put a shop floor in someone's
 * hallway. When the client's own photos land, mark them in /admin with the
 * corner cropper instead — an /admin crop wins over anything generated here,
 * because it is cut from the untouched original rather than the 960px copy.
 */
export type LeafQuad = readonly [
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
  readonly [number, number],
]

export interface LeafSpec {
  quad: LeafQuad
  /**
   * Mirror the crop left-to-right.
   *
   * `.door-scene__leaf` hinges on `transform-origin: left center`, so every
   * door on this site swings open from its left edge and the handle has to be
   * on the right. Several of these photographs are of right-hung doors, and a
   * mirrored leaf is still a truthful picture of the design — so this is a
   * photo fix, not a second hinge to maintain. Same reasoning as `crop.flip`
   * in the admin cropper.
   */
  flip?: boolean
}

interface Entry {
  cover: string
  gallery?: string[]
  leaf?: LeafSpec
}

const MAP: Record<string, Entry> = {
  'burma-teak-door': {
    cover: 'main-04',
    gallery: ['main-40', 'main-42'],
    leaf: { quad: [[0.138, 0.08], [0.663, 0.073], [0.665, 0.8], [0.136, 0.806]] },
  },
  'burma-border-teak-door': {
    cover: 'main-25',
    gallery: ['main-10'],
    leaf: { quad: [[0.163, 0.098], [0.775, 0.08], [0.762, 0.955], [0.222, 0.958]] },
  },
  'teak-osc-2nds': {
    cover: 'main-41',
    gallery: ['main-05'],
    leaf: { quad: [[0.192, 0.123], [0.826, 0.118], [0.828, 0.909], [0.19, 0.912]], flip: true },
  },
  'gana-teak-polish-door': {
    cover: 'main-09',
    gallery: ['main-02'],
    leaf: { quad: [[0.128, 0.07], [0.842, 0.055], [0.852, 0.88], [0.13, 0.895]] },
  },
  'architect-teak-door': {
    cover: 'main-34',
    gallery: ['main-36', 'main-48', 'main-49'],
    leaf: { quad: [[0.078, 0.052], [0.89, 0.047], [0.89, 0.944], [0.078, 0.949]] },
  },
  'honne-ab-door': {
    cover: 'main-27',
    gallery: ['main-33'],
    leaf: { quad: [[0.105, 0.272], [0.618, 0.278], [0.618, 0.925], [0.105, 0.92]], flip: true },
  },
  'mahagony-ab-door': {
    cover: 'main-16',
    gallery: ['main-22'],
    leaf: { quad: [[0.15, 0.078], [0.805, 0.074], [0.805, 0.925], [0.15, 0.929]], flip: true },
  },
  'veneer-designer-door': {
    cover: 'room-03',
    gallery: ['main-13'],
    leaf: { quad: [[0.275, 0.142], [0.74, 0.142], [0.74, 0.905], [0.275, 0.905]], flip: true },
  },
  'veneer-cng-door': {
    cover: 'main-11',
    gallery: ['main-20', 'main-38'],
    leaf: { quad: [[0.245, 0.095], [0.885, 0.088], [0.887, 0.845], [0.243, 0.848]], flip: true },
  },
  'laminate-cng-door': {
    cover: 'room-31',
    gallery: ['room-45'],
    leaf: { quad: [[0.325, 0.03], [0.615, 0.03], [0.615, 0.905], [0.325, 0.905]], flip: true },
  },
  'laminate-designer-door': {
    cover: 'room-20',
    gallery: ['room-07', 'room-35'],
    leaf: { quad: [[0.285, 0.145], [0.735, 0.145], [0.735, 0.905], [0.285, 0.905]], flip: true },
  },
  'microcoat-door': {
    cover: 'room-44',
    gallery: ['room-24'],
    leaf: { quad: [[0.179, 0.108], [0.854, 0.108], [0.854, 0.938], [0.179, 0.938]] },
  },
  'primer-door': {
    cover: 'room-10',
    gallery: ['room-22'],
    leaf: { quad: [[0.208, 0.099], [0.746, 0.099], [0.746, 0.919], [0.208, 0.919]], flip: true },
  },
  'korean-membrane-door': {
    cover: 'room-30',
    gallery: ['room-39', 'room-28'],
    leaf: { quad: [[0.145, 0.085], [0.822, 0.085], [0.822, 0.877], [0.145, 0.877]] },
  },
  'membrane-door': {
    cover: 'room-33',
    gallery: ['room-50', 'room-38', 'room-05'],
    leaf: { quad: [[0.325, 0.075], [0.695, 0.075], [0.695, 0.925], [0.325, 0.925]], flip: true },
  },
  'wpc-cnc-door': {
    cover: 'room-25',
    gallery: ['room-23'],
    leaf: { quad: [[0.105, 0.045], [0.865, 0.045], [0.865, 0.965], [0.105, 0.965]], flip: true },
  },
  'wpc-digital-veneer-door': {
    cover: 'main-03',
    gallery: ['main-39'],
    leaf: { quad: [[0.135, 0.115], [0.47, 0.112], [0.472, 0.855], [0.133, 0.857]], flip: true },
  },
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
  return { kind: 'photo', cover, gallery, leaf: leafImageFor(productId, name) }
}

/**
 * The generated leaf cut-out for a product, if one has been built.
 *
 * Applied as an overlay in products.ts rather than only here, because the CMS
 * replaces a merged product wholesale — a leaf attached only to the local
 * `photoVisualFor` would vanish for every id Supabase also carries, which is
 * all seventeen of them.
 */
export function leafImageFor(productId: string, alt: string): ProductImage | undefined {
  const leaf = LEAF_IMAGES[productId]
  if (!leaf) return undefined
  return { ...leaf, alt, isLeafCrop: true }
}

/** Where each leaf is in its photo — read by scripts/build-leaves.mjs. */
export const LEAF_SOURCES: { id: string; image: string; leaf: LeafSpec }[] = Object.entries(MAP).flatMap(
  ([id, m]) => (m.leaf ? [{ id, image: m.cover, leaf: m.leaf }] : []),
)
