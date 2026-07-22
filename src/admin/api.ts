import { supabase } from '../lib/supabase'
import type { PhotoPresentation, Product, ProductImage, WorldId } from '../data/products'

/** Admin-side shapes (superset of the public Product — carries db ids). */
export interface DbSubcategory {
  id: string
  world: WorldId
  name: string
  slug: string
  sort_order: number
}

export interface DbImage {
  id?: string
  role: 'cover' | 'gallery'
  src_480: string
  src_960: string
  width: number
  height: number
  original_path?: string | null
  crop?: unknown
  sort_order: number
}

export interface DbProduct {
  id?: string
  slug: string
  name: string
  world: WorldId
  subcategory_id: string
  tag: string
  story: string | null
  specs: string[]
  purchasable: boolean
  price: number | null
  price_unit: string | null
  presentation: PhotoPresentation
  sort_order: number
  published: boolean
  images?: DbImage[]
}

function db() {
  if (!supabase) throw new Error('Supabase is not configured (set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
  return supabase
}

export async function listSubcategories(): Promise<DbSubcategory[]> {
  const { data, error } = await db().from('subcategories').select('*').order('sort_order')
  if (error) throw error
  return data as DbSubcategory[]
}

export async function listProducts(): Promise<DbProduct[]> {
  const { data, error } = await db()
    .from('products')
    .select('*, images:product_images(*)')
    .order('sort_order')
  if (error) throw error
  return (data as DbProduct[]).map((p) => ({ ...p, images: (p.images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order) }))
}

export async function getProduct(id: string): Promise<DbProduct | null> {
  const { data, error } = await db().from('products').select('*, images:product_images(*)').eq('id', id).single()
  if (error) return null
  const p = data as DbProduct
  return { ...p, images: (p.images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order) }
}

export async function createSubcategory(world: WorldId, name: string): Promise<DbSubcategory> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data, error } = await db()
    .from('subcategories')
    .insert({ world, name, slug, sort_order: 90 })
    .select()
    .single()
  if (error) throw error
  return data as DbSubcategory
}

export async function renameSubcategory(id: string, name: string): Promise<void> {
  const { error } = await db().from('subcategories').update({ name }).eq('id', id)
  if (error) throw error
}

export async function reorderSubcategory(id: string, sort_order: number): Promise<void> {
  const { error } = await db().from('subcategories').update({ sort_order }).eq('id', id)
  if (error) throw error
}

export async function deleteSubcategory(id: string): Promise<void> {
  const { error } = await db().from('subcategories').delete().eq('id', id)
  if (error) throw error
}

/** Upsert a product and replace its images. Returns the product id. */
export async function saveProduct(p: DbProduct): Promise<string> {
  const { images, id, ...fields } = p
  const row = id ? { ...fields, id } : fields
  const { data, error } = await db().from('products').upsert(row).select('id').single()
  if (error) throw error
  const productId = (data as { id: string }).id

  // replace image rows
  await db().from('product_images').delete().eq('product_id', productId)
  if (images && images.length) {
    const rows = images.map((im, i) => ({
      product_id: productId,
      role: im.role,
      src_480: im.src_480,
      src_960: im.src_960,
      width: im.width,
      height: im.height,
      original_path: im.original_path ?? null,
      crop: im.crop ?? null,
      sort_order: i,
    }))
    const { error: imgErr } = await db().from('product_images').insert(rows)
    if (imgErr) throw imgErr
  }
  return productId
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await db().from('products').delete().eq('id', id)
  if (error) throw error
}

/** Upload a processed webp blob to the public `catalog` bucket, return its URL.
 *  Paths are unique (uuid) so no upsert is needed — upsert triggers the storage
 *  UPDATE policy path and is rejected by RLS. */
export async function uploadCatalog(path: string, blob: Blob): Promise<string> {
  const { error } = await db().storage.from('catalog').upload(path, blob, { contentType: 'image/webp' })
  if (error) throw error
  return db().storage.from('catalog').getPublicUrl(path).data.publicUrl
}

/** Upload the untouched original to the private `originals` bucket (for re-crop). */
export async function uploadOriginal(path: string, file: File): Promise<string> {
  const { error } = await db().storage.from('originals').upload(path, file)
  if (error) throw error
  return path
}

/** Convert a DbProduct to the public Product shape (for the live preview). */
export function toPreviewProduct(p: DbProduct, subName: string): Product {
  const cover = p.images?.find((i) => i.role === 'cover') ?? p.images?.[0]
  const toImg = (im: DbImage): ProductImage => ({
    src: im.src_480,
    srcSet: `${im.src_480} 480w, ${im.src_960} 960w`,
    alt: p.name,
    w: im.width,
    h: im.height,
  })
  const visual = cover
    ? {
        kind: 'photo' as const,
        cover: toImg(cover),
        gallery: (p.images ?? []).filter((i) => i !== cover).map(toImg),
        presentation: p.presentation,
      }
    : materialFor(p.world)
  return {
    id: p.slug || 'preview',
    name: p.name || 'Untitled',
    world: p.world,
    sub: subName,
    tag: p.tag,
    story: p.story ?? undefined,
    specs: p.specs,
    visual,
    purchasable: Boolean(p.purchasable && p.price),
    price: p.price ?? undefined,
    priceUnit: (p.price_unit as Product['priceUnit']) ?? undefined,
  }
}

function materialFor(world: WorldId): Product['visual'] {
  const m = {
    timbers: { kind: 'material' as const, material: 'timber' as const, base: '#8A6845', dark: '#6E5236', light: '#A57F55' },
    ply: { kind: 'material' as const, material: 'ply' as const, base: '#C9AE85', dark: '#8A7355', light: '#E2CDA8' },
    wpc: { kind: 'material' as const, material: 'wpc' as const, base: '#B8C4C0', dark: '#7E8F8A', light: '#DDE5E2' },
    doors: { kind: 'art' as const, art: 'classic' as const, tones: 'wood' as const, defaultTone: 'teak' },
  }
  return m[world]
}
