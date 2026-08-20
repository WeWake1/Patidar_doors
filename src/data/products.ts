/**
 * Catalog, finishes, sizes and pricing for all four worlds
 * (Timbers · Doors · Ply · WPC).
 *
 * ── CMS (Supabase + /admin) ───────────────────────────────────────────────
 * The client manages the catalogue in the custom admin (src/admin/). At build
 * time `npm run catalog:fetch` writes published rows to catalog.gen.ts and
 * PRODUCTS below merges them over this local base (see the merge at the
 * bottom). Local data doubles as the seed (scripts/seed-supabase.mjs) and the
 * fallback when no CMS is configured. Setup: docs/admin-setup.md.
 *
 * ⚠️ Product copy (tags/stories/specs) is drafted placeholder text — verify
 * every line with the client before launch.
 *
 * ⚠️ There is no drawn door in the catalogue any more. The 12 "Designer
 * Studio" doors (11 of them plus The Sentinel under "Safety Doors") were
 * original SVG artwork drafted as placeholders while the client's own
 * photography was pending, and they were removed on 2026-08-20 — a showcase
 * whose whole job is footfall to a real shop floor cannot front designs the
 * shop floor does not stock. Every product here is now either a photograph of
 * a real door or a generated material swatch. `DoorArt`'s `classic` leaf
 * survives only as the hero corridor's texture and as the fallback for a door
 * whose photo has not landed yet.
 */

import { CMS_PRODUCTS } from './catalog.gen'
import { leafImageFor, photoVisualFor } from './photoMap'
import type { DoorConfig, PriceResult } from './pricing'
import { calcPrice, configFromLine, formatSizeLabel, parseSizeId } from './pricing'

export type WorldId = 'timbers' | 'doors' | 'ply' | 'wpc'

/**
 * The one drawn leaf left. It is not a catalogue design — it is the plain
 * panelled door used as the hero corridor's Doors texture and as the stand-in
 * for a real door whose photograph has not been shot yet.
 */
export type ArtId = 'classic'

/** A wood tone the drawn leaf is tinted with. */
export interface Tone {
  id: string
  name: string
  /** mid tone */
  base: string
  /** grain / shadow tone */
  dark: string
  /** highlight tone */
  light: string
  /** whether grain texture is drawn */
  grain: boolean
  /** extra ₹ on top of base price */
  delta: number
}

export const WOOD_TONES: Tone[] = [
  { id: 'walnut', name: 'Natural Walnut', base: '#6B5138', dark: '#54402A', light: '#7E6347', grain: true, delta: 0 },
  { id: 'teak', name: 'Golden Teak', base: '#8A6A45', dark: '#715436', light: '#9D7C54', grain: true, delta: 0 },
  { id: 'oak', name: 'Pale Oak', base: '#B79A72', dark: '#9D8158', light: '#C9AE85', grain: true, delta: 0 },
  { id: 'smoked', name: 'Smoked Oak', base: '#4A3A2B', dark: '#392C20', light: '#5B4936', grain: true, delta: 1200 },
  { id: 'ebony', name: 'Ebonised Walnut', base: '#2A2118', dark: '#1D1710', light: '#3A2F23', grain: true, delta: 2400 },
]

/**
 * Only wood remains: the paint and steel ramps existed for The Flute, The Noir
 * and The Sentinel, and went with them.
 */
const TONE_GROUPS = {
  wood: WOOD_TONES,
} as const

export type ToneGroup = keyof typeof TONE_GROUPS

export interface SizeOption {
  id: string
  /** e.g. 7′0″ × 3′0″ */
  label: string
  note: string
  widthIn: number
  heightIn: number
}

/**
 * The sizes people actually ask for. Since the configurator went in these are
 * no longer the only buyable sizes — the sliders take any ¼″ — they are the
 * labelled ticks under them, and one tap sets both sliders.
 */
export const COMMON_SIZES: SizeOption[] = [
  { id: '78x30', label: '6′6″ × 2′6″', note: 'Bath & utility', widthIn: 30, heightIn: 78 },
  { id: '84x33', label: '7′0″ × 2′9″', note: 'Bedroom', widthIn: 33, heightIn: 84 },
  { id: '84x36', label: '7′0″ × 3′0″', note: 'Bedroom, wide', widthIn: 36, heightIn: 84 },
  { id: '96x36', label: '8′0″ × 3′0″', note: 'Main door (standard)', widthIn: 36, heightIn: 96 },
  { id: '96x48', label: '8′0″ × 4′0″', note: 'Grand entrance', widthIn: 48, heightIn: 96 },
]

/** Base prices refer to this leaf (8′ × 3′). */
export const BASE_SIZE_ID = '96x36'

/** A processed catalog photo (see scripts/import-images.mjs). */
export interface ProductImage {
  src: string
  srcSet?: string
  alt: string
  w: number
  h: number
  /**
   * True when this image was cropped with the admin's corner tool, so the
   * picture *is* the door leaf: background removed, camera tilt straightened,
   * edge to edge. The doorway try-on can then warp the whole image onto a
   * customer's doorway with nothing to cut away first.
   *
   * Set automatically by the cropper — never by hand. Absent on the older
   * photos, which are still whole-showroom shots and would put our shop floor
   * in someone's hallway.
   */
  isLeafCrop?: boolean
}

/**
 * How a product is shown:
 *  - art:      hand-drawn SVG door tinted by a tone group (configurable finish)
 *  - photo:    real photograph — the cover gets the door hover-open treatment
 *  - material: generated material swatch (timber planks, ply strata, WPC board)
 */
export type Visual =
  | { kind: 'art'; art: ArtId; tones: ToneGroup; defaultTone: string }
  | {
      kind: 'photo'
      cover: ProductImage
      gallery?: ProductImage[]
      presentation?: PhotoPresentation
      /**
       * The leaf, cut out of `cover` and squared up: no wall, no architrave, no
       * camera tilt — the whole image is the door, edge to edge. This is the
       * only thing "see it in your doorway" can warp into a customer's photo,
       * and it is deliberately a *second* image rather than a replacement:
       * the cover keeps the room around the door, which is what makes it read
       * as a real door on a card.
       *
       * Set either by the admin's corner cropper (which crops in place, so the
       * cover itself is the leaf and carries `isLeafCrop`) or by
       * `npm run leaves:build` from the corners marked in photoMap.ts.
       */
      leaf?: ProductImage
    }
  | { kind: 'material'; material: 'timber' | 'ply' | 'wpc'; base: string; dark: string; light: string }

/**
 * How a photo card behaves on hover/scroll:
 *  - swing:    the door-open animation (clean, straight-on, isolated leaf)
 *  - showcase: a gentle zoom/lift (in-situ room photos that would look wrong swung)
 * Absent ⇒ 'swing' (the original curated behaviour).
 */
export type PhotoPresentation = 'swing' | 'showcase'

export interface Product {
  id: string
  name: string
  world: WorldId
  /** subcategory label, matches worlds.ts subcategories */
  sub: string
  /** one-line description shown on cards */
  tag: string
  /** longer story for the product page */
  story?: string
  /** construction / grade bullet points */
  specs: string[]
  visual: Visual
  /** false ⇒ no online price; card & PDP show an "Enquire" CTA instead */
  purchasable: boolean
  /** base ₹ for the standard 8′×3′ leaf, installed (purchasable doors only) */
  price?: number
  priceUnit?: 'leaf' | 'cft' | 'sqft' | 'sheet'
}

/* ═══════════════ TIMBERS — raw wood from the yard ════════════════════════ */

function timber(
  id: string,
  name: string,
  sub: string,
  tag: string,
  colors: [base: string, dark: string, light: string],
  specs: string[],
): Product {
  return {
    id,
    name,
    world: 'timbers',
    sub,
    tag,
    specs,
    purchasable: false,
    priceUnit: 'cft',
    visual: { kind: 'material', material: 'timber', base: colors[0], dark: colors[1], light: colors[2] },
  }
}

const TIMBER_PRODUCTS: Product[] = [
  timber('burmese-teak', 'Burmese Teak', 'Teak', 'The benchmark — tight grain, natural oils, decades of life', ['#8A6845', '#6E5236', '#A57F55'], [
    'Imported Burma teak logs, sawn in-house',
    'High natural oil content — termite & rot resistant',
    'Ideal for main doors, frames & carving',
    'Sold per cubic foot, cut to order',
  ]),
  timber('burma-border-teak', 'Burma Border Teak', 'Teak', 'Border-grade Burma teak — the classic look, keener price', ['#8F6C46', '#725638', '#A88255'], [
    'Burma-border teak, graded and seasoned',
    'Straight grain, warm golden tone',
    'Doors, frames, windows & furniture',
    'Sold per cubic foot, cut to order',
  ]),
  timber('gana-teak', 'Gana Teak Wood', 'Teak', 'African teak with bold figure — strong and stable', ['#96754C', '#785C3B', '#AD8A5C'], [
    'Ghana teak, kiln-seasoned',
    'Pronounced grain figure',
    'Good stability across seasons',
    'Sold per cubic foot, cut to order',
  ]),
  timber('commercial-teak', 'Commercial Teak Wood', 'Teak', 'Everyday teak for frames and general woodwork', ['#9C7B52', '#7E6240', '#B29063'], [
    'Budget-friendly teak grade',
    'Frames, shutters & general carpentry',
    'Machined to your sizes',
    'Sold per cubic foot',
  ]),
  timber('australian-honne', 'Australian Honne Wood', 'Honne', 'Dense reddish hardwood — takes polish beautifully', ['#8B5A3C', '#6F4730', '#A26C49'], [
    'Imported Australian honne',
    'High density, excellent screw-holding',
    'Doors, frames & heavy sections',
    'Sold per cubic foot, cut to order',
  ]),
  timber('malaysian-honne', 'Malaysian Honne Wood', 'Honne', 'Workhorse hardwood for frames and structure', ['#96654A', '#79513B', '#AC785A'], [
    'Malaysian honne (kapur family)',
    'Uniform texture, easy to machine',
    'Frames, beams & windows',
    'Sold per cubic foot',
  ]),
  timber('redsal', 'Redsal Wood', 'Sal', 'Load-bearing red sal — the builder’s hardwood', ['#7A4A3A', '#61392D', '#8F5B48'], [
    'Seasoned red sal',
    'Very high strength & durability',
    'Structural work, frames, rafters',
    'Sold per cubic foot',
  ]),
  timber('whitesal', 'Whitesal Wood', 'Sal', 'Light-toned sal for frames and utility work', ['#A98F6B', '#8A7355', '#BFA57E'], [
    'Seasoned white sal',
    'Straight sections, economical',
    'Frames & general construction',
    'Sold per cubic foot',
  ]),
  timber('mahagony', 'Mahagony Wood', 'Hardwood & Neem', 'Deep reddish-brown, fine grain — furniture royalty', ['#6E3F30', '#553025', '#84503E'], [
    'Plantation mahogany, kiln-dried',
    'Fine, even grain — carves & polishes well',
    'Furniture, panelling, doors',
    'Sold per cubic foot',
  ]),
  timber('neem-premium', 'Neem Premium', 'Hardwood & Neem', 'Naturally pest-resistant, select grade', ['#8F7350', '#71593D', '#A58862'], [
    'Select-grade seasoned neem',
    'Naturally insect-repellent timber',
    'Doors, frames & shelving',
    'Sold per cubic foot',
  ]),
  timber('neem-regular', 'Neem Regular', 'Hardwood & Neem', 'Honest, economical hardwood for everyday work', ['#977C59', '#796244', '#AC916B'], [
    'Standard-grade seasoned neem',
    'Economical all-rounder',
    'Utility doors & frames',
    'Sold per cubic foot',
  ]),
]

/* ═══════════════ DOORS — factory door lines (photos arriving) ════════════ */

function factoryDoor(
  id: string,
  name: string,
  sub: string,
  tag: string,
  defaultTone: string,
  specs: string[],
): Product {
  return {
    id,
    name,
    world: 'doors',
    sub,
    tag,
    specs,
    purchasable: false,
    priceUnit: 'leaf',
    // Curated photo when one exists; classic-leaf placeholder otherwise.
    visual: photoVisualFor(id, name) ?? { kind: 'art', art: 'classic', tones: 'wood', defaultTone },
  }
}

const FACTORY_DOORS: Product[] = [
  factoryDoor('burma-teak-door', 'Burma Teak Door', 'Teak Doors', 'Solid Burma teak, panel by panel — the heirloom door', 'teak', [
    'Solid Burma teak throughout',
    'Traditional panel construction',
    'Ready for polish of your choice',
    'Made to your frame size',
  ]),
  factoryDoor('burma-border-teak-door', 'Burma Border Teak Door', 'Teak Doors', 'Border teak build with the classic teak face', 'teak', [
    'Burma-border teak sections',
    'Solid panel or glazed layouts',
    'Seasoned to resist warping',
    'Made to your frame size',
  ]),
  factoryDoor('teak-osc-2nds', '2nds Teak OSC Doors', 'Teak Doors', 'One-side-clear teak seconds — real teak, real value', 'walnut', [
    'One side clear (OSC) teak grade',
    'Minor natural marks on reverse face',
    'The economical way into solid teak',
    'Limited stock, per-piece pricing',
  ]),
  factoryDoor('gana-teak-polish-door', 'Gana Teak Polish Doors', 'Teak Doors', 'Ghana teak, delivered pre-polished and ready to hang', 'teak', [
    'Ghana teak, factory polish finish',
    'No on-site polishing needed',
    'Consistent sheen across the leaf',
    'Made to your frame size',
  ]),
  factoryDoor('architect-teak-door', 'Architect Teak Doors', 'Teak Doors', 'Architect-spec teak doors built to drawing', 'smoked', [
    'Built to architect drawings & sections',
    'Custom panels, glazing & grooves',
    'Site-matched polish samples',
    'Project & bulk friendly',
  ]),
  factoryDoor('honne-ab-door', 'Honne A & B Grade Doors', 'Hardwood Doors', 'Dense honne hardwood doors in A and B grades', 'walnut', [
    'Australian/Malaysian honne builds',
    'A & B grades to suit budget',
    'Heavy, solid, secure feel',
    'Made to your frame size',
  ]),
  factoryDoor('mahagony-ab-door', 'Mahagony A & B Grade Doors', 'Hardwood Doors', 'Rich mahogany doors, two grades, one look', 'walnut', [
    'Plantation mahogany construction',
    'A & B grades available',
    'Takes deep polish beautifully',
    'Made to your frame size',
  ]),
  factoryDoor('veneer-designer-door', 'Veneer Designer Doors', 'Veneer Doors', 'Natural veneer faces in designer layouts', 'walnut', [
    'Natural wood veneer skins',
    'Designer groove & inlay patterns',
    'Solid engineered core',
    'Polish or PU finish options',
  ]),
  factoryDoor('veneer-cng-door', 'Veneer CNG Doors', 'Veneer Doors', 'CNC-carved grooves through natural veneer', 'teak', [
    'CNC-routed face patterns',
    'Natural veneer over solid core',
    'Crisp, repeatable detailing',
    'Made to your frame size',
  ]),
  factoryDoor('laminate-cng-door', 'Laminate CNG Doors', 'Laminate & Coated', 'CNC pattern work on tough laminate faces', 'oak', [
    'CNC-routed laminate face',
    'Scratch & stain resistant',
    'Solid engineered core',
    'Wide shade card available',
  ]),
  factoryDoor('laminate-designer-door', 'Laminate Designer Doors', 'Laminate & Coated', 'Designer laminates — grain, colour and texture', 'smoked', [
    '1 mm high-pressure laminate',
    'Wood, solid & textured shades',
    'Moisture-guard edge banding',
    'Made to your frame size',
  ]),
  factoryDoor('microcoat-door', 'Lamination / MicroCoated Doors', 'Laminate & Coated', 'Micro-coated skins — smooth, sealed, economical', 'oak', [
    'Micro-lamination coated face',
    'Uniform finish, easy to clean',
    'Economical for full projects',
    'Multiple shades available',
  ]),
  factoryDoor('primer-door', 'Primer Doors', 'Laminate & Coated', 'Primer-finished flush doors, ready for your paint', 'oak', [
    'Factory primer coat, paint-ready',
    'Smooth sanded flush face',
    'Pick any site-painted colour',
    'Project & bulk friendly',
  ]),
  factoryDoor('korean-membrane-door', 'Korean Membrane Doors', 'Membrane Doors', 'Imported Korean membrane — deeper texture, tighter wrap', 'walnut', [
    'Imported Korean membrane foil',
    'Seamless wrap over routed face',
    'Rich texture & matte options',
    'Made to your frame size',
  ]),
  factoryDoor('membrane-door', 'Membrane Doors', 'Membrane Doors', 'Seamless membrane-wrapped designs in many shades', 'teak', [
    'Membrane foil over MDF face',
    'Seamless, groove-friendly wrap',
    'Wide design & shade range',
    'Made to your frame size',
  ]),
]

/* ═══════════════ PLY — engineered panels ═════════════════════════════════ */

function ply(id: string, name: string, sub: string, tag: string, specs: string[]): Product {
  return {
    id,
    name,
    world: 'ply',
    sub,
    tag,
    specs,
    purchasable: false,
    priceUnit: 'sheet',
    visual: { kind: 'material', material: 'ply', base: '#C9AE85', dark: '#8A7355', light: '#E2CDA8' },
  }
}

const PLY_PRODUCTS: Product[] = [
  ply('xtreme-ply', 'XTREME Ply & B/B', 'Plywood', 'Flagship ply and blockboard for hard-working interiors', [
    'Plywood + blockboard range',
    'Dense, gap-free core',
    'Uniform thickness, low warp',
    'Standard 8′×4′ sheets',
  ]),
  ply('xplor-ply', 'XPLOR Ply', 'Plywood', 'Dependable commercial ply for everyday furniture', [
    'Commercial MR grade',
    'Smooth calibrated faces',
    'Furniture & panelling',
    'Standard 8′×4′ sheets',
  ]),
  ply('xlent-ply', 'XLENT Ply', 'Plywood', 'Step-up ply with tighter cores and cleaner faces', [
    'Premium MR grade',
    'Screw-holding certified',
    'Kitchens & wardrobes',
    'Standard 8′×4′ sheets',
  ]),
  ply('xlent-710-ply', 'XLENT 710 Ply', '710 Marine Grade', 'Boiling-waterproof 710 for kitchens and bathrooms', [
    'IS:710 BWP marine grade',
    '72-hour boil tested',
    'Kitchens, baths, exteriors',
    'Standard 8′×4′ sheets',
  ]),
  ply('xtron-calibrated', 'XTRON Calibrated Ply', 'Calibrated', 'Machine-calibrated thickness for flawless laminates', [
    'European calibration line',
    '±0.2 mm thickness tolerance',
    'Zero undulation under laminate',
    'Standard 8′×4′ sheets',
  ]),
  ply('xtron-club-prime-710', 'XTRON CLUB PRIME 710', '710 Marine Grade', 'Club-grade 710 with hardwood throughout', [
    'IS:710 BWP, full hardwood core',
    'Chemically treated, borer-proof',
    'Heavy-duty furniture & marine use',
    'Standard 8′×4′ sheets',
  ]),
  ply('xtron-signature-710', 'XTRON SIGNATURE 710', '710 Marine Grade', 'The signature sheet — our best core, our best face', [
    'Flagship IS:710 BWP grade',
    'A+ faces both sides',
    'Lifetime warranty programme',
    'Standard 8′×4′ sheets',
  ]),
  ply('xtorq-bb', 'XTORQ B/B Pine & H/W', 'Blockboard', 'Pine and hardwood blockboards that stay dead straight', [
    'Seasoned pine / hardwood battens',
    'No sag on long spans',
    'Wardrobe shutters & panels',
    'Standard 8′×4′ sheets',
  ]),
]

/* ═══════════════ WPC — waterproof polymer boards & doors ═════════════════ */

const WPC_PRODUCTS: Product[] = [
  {
    id: 'wpc-sheets',
    name: 'WPC Solid Sheets',
    world: 'wpc',
    sub: 'WPC Sheets',
    tag: '100% waterproof boards — 6 mm to 18 mm, two densities',
    specs: [
      'Thicknesses: 18 / 16 / 12 / 8 / 6 mm',
      'Densities: 0.45 & 0.55',
      'Waterproof, termite-proof, fire-retardant',
      'Screws, routs & paints like wood',
    ],
    purchasable: false,
    priceUnit: 'sheet',
    visual: { kind: 'material', material: 'wpc', base: '#B8C4C0', dark: '#7E8F8A', light: '#DDE5E2' },
  },
  {
    id: 'wpc-cnc-door',
    name: '28 mm CNC WPC Doors',
    world: 'wpc',
    sub: 'WPC Doors',
    tag: 'CNC-carved WPC doors — zero swelling, ever',
    specs: [
      '28 mm solid WPC leaf',
      'CNC-carved face designs',
      'Bathroom & utility safe — 100% waterproof',
      'Paint or PU finish options',
    ],
    purchasable: false,
    priceUnit: 'leaf',
    visual: photoVisualFor('wpc-cnc-door', '28 mm CNC WPC Doors') ?? {
      kind: 'material',
      material: 'wpc',
      base: '#A9B8B3',
      dark: '#71827D',
      light: '#D2DCD8',
    },
  },
  {
    id: 'wpc-digital-veneer-door',
    name: 'Digital Veneer WPC Doors',
    world: 'wpc',
    sub: 'WPC Doors',
    tag: '28 & 30 mm WPC with photo-real digital veneer faces',
    specs: [
      '28 mm & 30 mm leaves',
      'Digital-printed veneer textures',
      'Waterproof core, UV-stable print',
      'Wood looks without wood worries',
    ],
    purchasable: false,
    priceUnit: 'leaf',
    visual: photoVisualFor('wpc-digital-veneer-door', 'Digital Veneer WPC Doors') ?? {
      kind: 'material',
      material: 'wpc',
      base: '#9C8B70',
      dark: '#6F6350',
      light: '#C2B294',
    },
  },
]

/**
/**
 * Local catalogue merged with the CMS (catalog.gen.ts, written by
 * `npm run catalog:fetch`): a CMS product with a matching id replaces the
 * local entry and brand-new slugs are appended.
 *
 * The Designer Studio carve-out that used to sit here is gone with the doors
 * it protected — every id in this file is now a real product the store
 * actually stocks, so the CMS is free to own all of them.
 */
const LOCAL_PRODUCTS: Product[] = [...FACTORY_DOORS, ...TIMBER_PRODUCTS, ...PLY_PRODUCTS, ...WPC_PRODUCTS]
const LOCAL_IDS = new Set(LOCAL_PRODUCTS.map((p) => p.id))
const CMS_OVERRIDES = new Map(CMS_PRODUCTS.map((p) => [p.id, p]))

const MERGED: Product[] = [
  ...LOCAL_PRODUCTS.map((p) => CMS_OVERRIDES.get(p.id) ?? p),
  ...CMS_PRODUCTS.filter((p) => !LOCAL_IDS.has(p.id)),
]

/**
 * ⚠️ PLACEHOLDER PRICES — every number below is invented, exactly like the
 * rates in pricing.ts, and the whole table must be confirmed with the client.
 * Each is the all-in ₹ for a plain 30 mm 8′ × 3′ leaf, installed, GST in;
 * `calcPrice` derives every other size and option from it.
 *
 * It is applied **after** the CMS merge rather than written into the product
 * literals above, and that is deliberate: `npm run catalog:fetch` overwrites a
 * merged product wholesale, so a price set locally on an id the CMS also
 * carries would silently vanish on the next fetch. The day the client types a
 * real price into /admin, delete that door's line here and the CMS value
 * stands on its own.
 */
const PLACEHOLDER_PRICES: Record<string, number> = {
  'burma-teak-door': 68000,
  'burma-border-teak-door': 52000,
  'teak-osc-2nds': 34000,
  'gana-teak-polish-door': 46000,
  'architect-teak-door': 78000,
  'honne-ab-door': 29500,
  'mahagony-ab-door': 33500,
  'veneer-designer-door': 24500,
  'veneer-cng-door': 27500,
  'laminate-cng-door': 19500,
  'laminate-designer-door': 17500,
  'microcoat-door': 12500,
  'primer-door': 9500,
  'korean-membrane-door': 21500,
  'membrane-door': 16500,
  'wpc-cnc-door': 22500,
  'wpc-digital-veneer-door': 25500,
}

/**
 * The catalogue the site renders.
 *
 * Two overlays run over the merge, both keyed by product id and both there for
 * the same reason — they carry curation that lives in this repo rather than in
 * the CMS, and a wholesale CMS override would otherwise drop it:
 *
 *  1. `PLACEHOLDER_PRICES` — a price the client has not set yet (above).
 *  2. `leafImageFor` — the perspective-corrected leaf cut-out that
 *     "see it in your doorway" warps into a customer's photo. A CMS image gets
 *     one by being cropped with the admin's corner tool (`isLeafCrop`); the 17
 *     seeded photographs never were, so their leaves are marked in photoMap.ts
 *     and generated by `npm run leaves:build`. Whichever exists wins, and a
 *     real /admin crop takes precedence — see `tryState`.
 */
export const PRODUCTS: Product[] = MERGED.map((p) => {
  const price = PLACEHOLDER_PRICES[p.id]
  const leaf = p.visual.kind === 'photo' && !p.visual.cover.isLeafCrop ? leafImageFor(p.id, p.name) : undefined
  if (price === undefined && !leaf) return p
  return {
    ...p,
    ...(price === undefined ? {} : { purchasable: true, price, priceUnit: 'leaf' as const }),
    ...(leaf ? { visual: { ...p.visual, leaf } } : {}),
  }
})

/* ═══════════════ helpers ═════════════════════════════════════════════════ */

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function productsIn(world: WorldId): Product[] {
  return PRODUCTS.filter((p) => p.world === world)
}

export function tonesFor(product: Product): Tone[] {
  return product.visual.kind === 'art' ? TONE_GROUPS[product.visual.tones] : []
}

export function defaultToneId(product: Product): string {
  return product.visual.kind === 'art' ? product.visual.defaultTone : WOOD_TONES[1].id
}

export function getTone(product: Product, toneId: string): Tone {
  const tones = tonesFor(product)
  if (tones.length === 0) return WOOD_TONES[1]
  return tones.find((t) => t.id === toneId) ?? tones[0]
}

/**
 * Whether a product can be stood in a customer's doorway (`/try/:id`).
 *
 * ⚠️ **Doors only — every door, and nothing but doors.** That includes WPC,
 * which is a door made of wood-plastic composite rather than a separate kind of
 * thing; it has its own world only because it is sold and finished differently.
 * It excludes timber and ply, which are not doors at all.
 *
 * The rule reads `visual.kind`, and that is not a coincidence — the catalogue
 * already encodes the distinction. A door is either drawn (`art`) or
 * photographed (`photo`); `material` is a generated swatch of board stock:
 * teak billets, ply sheets, and `wpc-sheets` (6–18 mm board). You cannot stand
 * a cubic foot of teak in a doorway.
 *
 * - `ready` — renders today.
 * - `soon`  — a real door with no leaf cut-out yet, so there is nothing to
 *             warp that would not put our shop floor in someone's hallway.
 *             Every catalogue door has one as of 2026-08-20; this branch is
 *             what a *newly uploaded* photo reports until it is cropped.
 * - `no`    — not a door.
 */
export type TryState = 'ready' | 'soon' | 'no'

export function tryState(product: Product): TryState {
  return leafOf(product) ? 'ready' : product.visual.kind === 'material' ? 'no' : 'soon'
}

/**
 * The image `/try` warps, or null if this product has no leaf to stand in a
 * doorway. One function so the route, the PDP button and `tryState` can never
 * disagree about what is placeable — the bug that shipped before this was the
 * PDP offering a door the route then refused.
 *
 * An /admin crop wins over a generated one: it was cut from the untouched
 * original, whereas `leaves:build` only ever had the 960px web copy.
 */
export function leafOf(product: Product): ProductImage | null {
  const v = product.visual
  if (v.kind !== 'photo') return null
  if (v.cover.isLeafCrop) return v.cover
  return v.leaf ?? null
}

/**
 * Any `height x width` in inches resolves — `'84x33'` from a preset, `'79.25x32'`
 * straight off the sliders, or an id saved in a cart before the configurator
 * existed (they share the same shape, which is why old carts still price).
 */
export function getSize(sizeId: string): SizeOption {
  const preset = COMMON_SIZES.find((s) => s.id === sizeId)
  if (preset) return preset
  const parsed = parseSizeId(sizeId)
  if (!parsed) return COMMON_SIZES[3]
  return {
    id: sizeId,
    label: formatSizeLabel(parsed.heightIn, parsed.widthIn),
    note: 'Made to measure',
    widthIn: parsed.widthIn,
    heightIn: parsed.heightIn,
  }
}

/**
 * Made-to-measure price. The size and the options are the whole quote now —
 * see `src/data/pricing.ts` for the model (stock-panel snapping, fixed +
 * per-sq-ft leaf, flat add-ons, frame by running foot).
 */
export function priceFor(product: Product, sizeId: string, toneId: string, opts?: Partial<DoorConfig>): number {
  if (!product.purchasable || product.price === undefined) return 0
  const tone = getTone(product, toneId)
  return calcPrice(product.price, tone.delta, configFromLine(sizeId, opts)).total
}

/** The full quote — same numbers as `priceFor`, plus the breakdown to show. */
export function quoteFor(product: Product, config: DoorConfig, toneId: string): PriceResult | null {
  if (!product.purchasable || product.price === undefined) return null
  return calcPrice(product.price, getTone(product, toneId).delta, config)
}

/**
 * Featured on the home page — three real doors that between them cover the
 * range: an heirloom solid teak, a mid-range veneer and an everyday membrane.
 */
export const FEATURED_IDS = ['burma-teak-door', 'veneer-designer-door', 'membrane-door'] as const
