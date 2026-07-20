/**
 * One-time seed: push the local catalogue (everything except the 12 Designer
 * Studio doors) into Sanity so the client starts with a full, editable
 * catalogue — curated photos are uploaded as assets, material products carry
 * their swatch colours.
 *
 * Needs in env / root .env:
 *   SANITY_PROJECT_ID, SANITY_DATASET (default production),
 *   SANITY_WRITE_TOKEN  (manage.sanity.io → API → Tokens → Editor)
 *
 * Idempotent: documents use deterministic ids (product.<slug>) via
 * createOrReplace, and Sanity dedupes identical image uploads.
 * Run: npm run cms:seed
 */
import { readFile } from 'node:fs/promises'
import { registerHooks } from 'node:module'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const API_VERSION = 'v2025-02-19'

// Node's type-stripping runs the site's TS data modules directly (the TS
// config enforces erasable-only syntax), but its ESM resolver wants explicit
// extensions — retry the site's extensionless relative imports with `.ts`.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context)
    } catch (err) {
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
        try {
          return nextResolve(`${specifier}.ts`, context)
        } catch {
          throw err
        }
      }
      throw err
    }
  },
})
const { PRODUCTS } = await import('../src/data/products.ts')

async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // no .env
  }
}
await loadEnv()

const projectId = process.env.SANITY_PROJECT_ID
const dataset = process.env.SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
if (!projectId || !token) {
  console.error('cms:seed needs SANITY_PROJECT_ID and SANITY_WRITE_TOKEN (see docs/cms-setup.md)')
  process.exit(1)
}
const api = `https://${projectId}.api.sanity.io/${API_VERSION}`
const auth = { Authorization: `Bearer ${token}` }

const assetCache = new Map()

/** Upload a local processed image (public/…-480.webp → the 960 file) once. */
async function uploadImage(src) {
  const file = src.replace('-480.webp', '-960.webp')
  if (assetCache.has(file)) return assetCache.get(file)
  const buf = await readFile(path.join(ROOT, 'public', file))
  const name = path.basename(file)
  const res = await fetch(`${api}/assets/images/${dataset}?filename=${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'image/webp' },
    body: buf,
  })
  if (!res.ok) throw new Error(`asset upload ${name}: ${res.status} ${await res.text()}`)
  const { document } = await res.json()
  const ref = { _type: 'image', asset: { _type: 'reference', _ref: document._id } }
  assetCache.set(file, ref)
  return ref
}

const DESIGNER_IDS = new Set([
  'kyoto', 'meridian', 'jaali', 'deco', 'haveli', 'chevron',
  'linea', 'duet', 'flute', 'atrium', 'noir', 'sentinel',
])

const docs = []
let order = 0
for (const p of PRODUCTS) {
  if (DESIGNER_IDS.has(p.id)) continue
  order += 1
  const doc = {
    // NB: dashes, not dots — Sanity hides dot-namespaced ids from public queries
    _id: `product-${p.id}`,
    _type: 'product',
    name: p.name,
    slug: { _type: 'slug', current: p.id },
    world: p.world,
    sub: p.sub,
    tag: p.tag,
    ...(p.story ? { story: p.story } : {}),
    specs: p.specs,
    purchasable: Boolean(p.purchasable),
    ...(p.price ? { price: p.price } : {}),
    ...(p.priceUnit ? { priceUnit: p.priceUnit } : {}),
    order: order * 10,
  }
  if (p.visual.kind === 'photo') {
    doc.cover = await uploadImage(p.visual.cover.src)
    const gallery = []
    for (const [i, g] of (p.visual.gallery ?? []).entries()) {
      gallery.push({ ...(await uploadImage(g.src)), _key: `g${i}` })
    }
    if (gallery.length) doc.gallery = gallery
    console.log(`uploaded photos: ${p.id}`)
  } else if (p.visual.kind === 'material') {
    doc.swatch = { material: p.visual.material, base: p.visual.base, dark: p.visual.dark, light: p.visual.light }
  }
  docs.push(doc)
}

const res = await fetch(`${api}/data/mutate/${dataset}`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ mutations: docs.map((d) => ({ createOrReplace: d })) }),
})
if (!res.ok) {
  console.error(`mutate failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}
console.log(`cms:seed — ${docs.length} products seeded to ${projectId}/${dataset} (${assetCache.size} images)`)
