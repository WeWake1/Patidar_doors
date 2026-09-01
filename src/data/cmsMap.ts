/**
 * The one place a Supabase row becomes a site `Product`.
 *
 * This mapping used to live inside `scripts/fetch-catalog.mjs` alone, because
 * the CMS was only ever read at build time. The storefront now reads the same
 * rows *live* in the browser (see `liveCatalog.ts`), so the conversion is
 * shared: a second copy would drift, and the two copies would disagree about
 * exactly the thing that is hardest to notice — which products exist.
 *
 * Deliberately dependency-free (types only, no imports that run): the build
 * script loads this module through Vite's SSR loader, the way
 * `build-sitemap.mjs` already loads `products.ts`.
 */

import type { Product, ProductImage, StoredPresentation, Visual, WorldId } from './products'

/** The PostgREST `select=` both readers use. One shape, one mapper. */
export const CMS_SELECT =
  'slug,name,world,tag,story,specs,purchasable,price,price_unit,presentation,sort_order,' +
  'subcategory:subcategories(name,slug,sort_order),' +
  'images:product_images(role,src_480,src_960,width,height,crop,sort_order)'

/** Rows come back ordered so the site lists them the way /admin does. */
export const CMS_ORDER = 'world.asc,sort_order.asc,name.asc'

export interface CmsImageRow {
  role?: string | null
  src_480?: string | null
  src_960?: string | null
  width?: number | null
  height?: number | null
  crop?: unknown
  sort_order?: number | null
}

export interface CmsProductRow {
  slug?: string | null
  name?: string | null
  world?: string | null
  tag?: string | null
  story?: string | null
  specs?: string[] | null
  purchasable?: boolean | null
  price?: number | null
  price_unit?: string | null
  presentation?: string | null
  sort_order?: number | null
  subcategory?: { name?: string | null; slug?: string | null; sort_order?: number | null } | null
  images?: CmsImageRow[] | null
}

/** Ordered section names per world, as the client arranged them in /admin. */
export type CmsSections = Partial<Record<WorldId, string[]>>

const WORLD_IDS: WorldId[] = ['timbers', 'doors', 'ply', 'wpc']

/** Default swatch for a product with no photograph yet. */
const MATERIAL: Record<WorldId, Visual> = {
  timbers: { kind: 'material', material: 'timber', base: '#8A6845', dark: '#6E5236', light: '#A57F55' },
  ply: { kind: 'material', material: 'ply', base: '#C9AE85', dark: '#8A7355', light: '#E2CDA8' },
  wpc: { kind: 'material', material: 'wpc', base: '#B8C4C0', dark: '#7E8F8A', light: '#DDE5E2' },
  doors: { kind: 'art', art: 'classic', tones: 'wood', defaultTone: 'teak' },
}

function toImage(img: CmsImageRow | undefined, alt: string): ProductImage | undefined {
  if (!img?.src_480) return undefined
  /* `crop.mode === 'leaf'` means the admin's corner tool produced this image,
     so it *is* the door leaf — background gone, tilt straightened. Only those
     are safe to warp into a customer's doorway; an older whole-showroom shot
     would put our shop floor in their hallway. */
  const crop = img.crop as { mode?: unknown } | null | undefined
  const isLeafCrop = !!crop && typeof crop === 'object' && crop.mode === 'leaf'
  return {
    src: img.src_480,
    srcSet: `${img.src_480} 480w, ${img.src_960 ?? img.src_480} 960w`,
    alt,
    w: img.width ?? 0,
    h: img.height ?? 0,
    ...(isLeafCrop ? { isLeafCrop: true } : {}),
  }
}

function toVisual(row: CmsProductRow, world: WorldId): Visual {
  const images = (row.images ?? []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const coverRow = images.find((i) => i.role === 'cover') ?? images[0]
  const cover = toImage(coverRow, row.name ?? '')
  if (!cover) return MATERIAL[world]
  const gallery = images
    .filter((i) => i !== coverRow)
    .map((i) => toImage(i, row.name ?? ''))
    .filter((i): i is ProductImage => Boolean(i))
  return {
    kind: 'photo',
    cover,
    gallery,
    /* Anything the column doesn't recognise falls back to the original
       curated behaviour rather than to nothing. */
    presentation: (row.presentation === 'showcase' || row.presentation === 'still'
      ? row.presentation
      : 'swing') satisfies StoredPresentation,
  }
}

function isWorld(w: unknown): w is WorldId {
  return typeof w === 'string' && (WORLD_IDS as string[]).includes(w)
}

/**
 * Rows → products, plus the section order they imply.
 *
 * ⚠️ The only fields a row *must* have are the ones without which it cannot be
 * rendered or routed at all: a slug, a name, a real world and a section. `tag`
 * used to be required here too, and that was a silent trapdoor — a product
 * saved without its one-liner was dropped from the catalogue with nothing
 * anywhere to say so, and the owner saw a door they had definitely added
 * simply not appear. An empty tag is now an empty line on the card; the
 * editor asks for one on the way in, which is where a missing field belongs.
 */
export function mapCatalogue(rows: CmsProductRow[]): { products: Product[]; sections: CmsSections } {
  const products: Product[] = []
  /** section name → its sort_order, per world, so new sections land in place. */
  const order = new Map<WorldId, Map<string, number>>()

  for (const r of rows) {
    const world = r.world
    const sub = r.subcategory?.name
    if (!r.slug || !r.name || !isWorld(world) || !sub) continue

    const price = typeof r.price === 'number' && Number.isFinite(r.price) ? r.price : undefined
    products.push({
      id: r.slug,
      name: r.name,
      world,
      sub,
      tag: r.tag ?? '',
      ...(r.story ? { story: r.story } : {}),
      specs: r.specs ?? [],
      visual: toVisual(r, world),
      purchasable: Boolean(r.purchasable && price),
      ...(price === undefined ? {} : { price }),
      ...(r.price_unit ? { priceUnit: r.price_unit as Product['priceUnit'] } : {}),
    })

    const forWorld = order.get(world) ?? new Map<string, number>()
    const seen = forWorld.get(sub)
    const rank = r.subcategory?.sort_order ?? 90
    if (seen === undefined || rank < seen) forWorld.set(sub, rank)
    order.set(world, forWorld)
  }

  const sections: CmsSections = {}
  for (const [world, subs] of order) {
    sections[world] = [...subs.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name)
  }
  return { products, sections }
}
