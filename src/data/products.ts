/**
 * Catalog, finishes, sizes and pricing.
 *
 * The 12 designs are original artwork recreated from the most-pinned door
 * motifs of 2025–26 (fluted texture, brass inlay, japandi slats, jali
 * lattice, art-deco marquetry, chevron, ribbed glass, matte black, carved
 * heritage…). See docs/design-research.md for sources.
 */

export type Category = 'Laminated' | 'WPC' | 'Series' | 'Safety'

export type ArtId =
  | 'kyoto'
  | 'meridian'
  | 'jaali'
  | 'deco'
  | 'haveli'
  | 'chevron'
  | 'linea'
  | 'duet'
  | 'flute'
  | 'atrium'
  | 'noir'
  | 'sentinel'
  | 'classic' // hero door only, not in the catalog

/** A wood / paint / steel tone the artwork is tinted with. */
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

export const PAINT_TONES: Tone[] = [
  { id: 'sage', name: 'Sage Matte', base: '#8A9484', dark: '#75806F', light: '#9AA694', grain: false, delta: 0 },
  { id: 'clay', name: 'Terracotta Clay', base: '#B0725A', dark: '#98604B', light: '#C08269', grain: false, delta: 0 },
  { id: 'navy', name: 'Deep Navy', base: '#2E3A4E', dark: '#242E3E', light: '#3B4A63', grain: false, delta: 1200 },
  { id: 'black', name: 'Matte Black', base: '#26262A', dark: '#1B1B1E', light: '#333338', grain: false, delta: 1200 },
]

export const STEEL_TONES: Tone[] = [
  { id: 'graphite', name: 'Brushed Graphite', base: '#3C3C42', dark: '#2C2C31', light: '#4C4C54', grain: false, delta: 0 },
  { id: 'gunmetal', name: 'Gunmetal Blue', base: '#333A45', dark: '#262B34', light: '#424B59', grain: false, delta: 1200 },
]

const TONE_GROUPS = {
  wood: WOOD_TONES,
  paint: PAINT_TONES,
  steel: STEEL_TONES,
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

export const SIZES: SizeOption[] = [
  { id: '78x30', label: '6′6″ × 2′6″', note: 'Bath & utility', widthIn: 30, heightIn: 78 },
  { id: '84x33', label: '7′0″ × 2′9″', note: 'Bedroom', widthIn: 33, heightIn: 84 },
  { id: '84x36', label: '7′0″ × 3′0″', note: 'Bedroom, wide', widthIn: 36, heightIn: 84 },
  { id: '96x36', label: '8′0″ × 3′0″', note: 'Main door (standard)', widthIn: 36, heightIn: 96 },
  { id: '96x48', label: '8′0″ × 4′0″', note: 'Grand entrance', widthIn: 48, heightIn: 96 },
]

/** Base prices refer to this leaf (8′ × 3′). */
export const BASE_SIZE_ID = '96x36'

export interface Product {
  id: string
  name: string
  cat: Category
  /** one-line design description shown on cards */
  tag: string
  /** longer story for the product page */
  story: string
  /** the Pinterest-trend motif it recreates */
  motif: string
  /** base ₹ for the standard 8′×3′ leaf, installed */
  price: number
  art: ArtId
  tones: ToneGroup
  defaultTone: string
  /** construction bullet points */
  specs: string[]
}

export const PRODUCTS: Product[] = [
  {
    id: 'kyoto',
    name: 'The Kyoto',
    cat: 'Series',
    tag: 'Japandi slats in pale oak — calm, vertical, precise',
    story:
      'Narrow timber slats with hand-set shadow gaps run the full height of the leaf — the Japanese-Scandinavian profile that quietly took over design boards this year. Warmth without ornament.',
    motif: 'Japandi slatted door',
    price: 72000,
    art: 'kyoto',
    tones: 'wood',
    defaultTone: 'oak',
    specs: [
      'Solid engineered core, 35 mm leaf',
      '18 vertical slats, 3 mm shadow grooves',
      'Matte PU seal, low-VOC',
      'Full-height matte black edge pull',
    ],
  },
  {
    id: 'meridian',
    name: 'The Meridian',
    cat: 'Series',
    tag: 'Ebonised walnut split by a single line of brass',
    story:
      'One uninterrupted brass inlay runs floor to header through near-black walnut. The most-saved look in luxury entrances — vertical metal inlay on dark grain — reduced to its essence.',
    motif: 'Vertical brass-inlay door',
    price: 84500,
    art: 'meridian',
    tones: 'wood',
    defaultTone: 'ebony',
    specs: [
      'Solid core, 40 mm leaf',
      '6 mm solid brass inlay, hand-levelled',
      'Open-pore ebonised finish',
      'Concealed hinges, brass pull',
    ],
  },
  {
    id: 'jaali',
    name: 'The Jaali',
    cat: 'Series',
    tag: 'Diamond lattice over frosted glass — air and privacy',
    story:
      'The traditional Indian jali, machined to modern tolerances: a diamond lattice band lets light and air move while frosted backing keeps the room private. Heritage geometry, contemporary build.',
    motif: 'Modern jali / lattice door',
    price: 88000,
    art: 'jaali',
    tones: 'wood',
    defaultTone: 'teak',
    specs: [
      'CNC-cut lattice, 12 mm ribs',
      'Toughened frosted glass backing',
      'Brass trim around lattice field',
      'Breathable — ideal for pooja & study',
    ],
  },
  {
    id: 'deco',
    name: 'The Deco',
    cat: 'Series',
    tag: 'Art-deco fan in book-matched veneer and brass',
    story:
      'A sunburst fan of alternating veneers rises from the foot of the door, each ray parted by a sliver of brass. Statement geometry straight from the art-deco revival boards.',
    motif: 'Art-deco sunburst door',
    price: 96000,
    art: 'deco',
    tones: 'wood',
    defaultTone: 'walnut',
    specs: [
      'Book-matched veneer marquetry',
      'Inlaid brass rays, 2 mm',
      '40 mm solid core',
      'Demi-lune brass pull',
    ],
  },
  {
    id: 'haveli',
    name: 'The Haveli',
    cat: 'Series',
    tag: 'Hand-carved heritage borders with aged brass studs',
    story:
      'Carved by hand the way haveli doors have been for two centuries — layered borders, a studded field, and brass that will outlive the house. Our master-carver signs each leaf.',
    motif: 'Carved heritage / fort door',
    price: 132000,
    art: 'haveli',
    tones: 'wood',
    defaultTone: 'teak',
    specs: [
      'Seasoned solid wood, 45 mm',
      'Hand-carved twin borders',
      'Aged solid-brass studs & ring pull',
      'Natural oil finish, signed leaf',
    ],
  },
  {
    id: 'chevron',
    name: 'The Chevron',
    cat: 'Laminated',
    tag: 'Two-tone chevron laminate, seamless herringbone face',
    story:
      'Alternating chevrons in two tones of the same grain give the leaf constant movement. The herringbone door — one of the most-pinned interior door looks — made durable in laminate.',
    motif: 'Chevron / herringbone door',
    price: 44900,
    art: 'chevron',
    tones: 'wood',
    defaultTone: 'teak',
    specs: [
      '1 mm high-pressure laminate, both faces',
      'Mirror-matched chevron joints',
      'Solid engineered core, 32 mm',
      'Scratch & stain resistant',
    ],
  },
  {
    id: 'linea',
    name: 'The Linea',
    cat: 'Laminated',
    tag: 'Hand-routed groove trios across warm teak laminate',
    story:
      'Groups of three shadow grooves cross the leaf at measured intervals — the quiet lined texture found on every “modern door” board, cut deep so it reads at a distance.',
    motif: 'Grooved / lined door',
    price: 38900,
    art: 'linea',
    tones: 'wood',
    defaultTone: 'teak',
    specs: [
      'Routed grooves, 4 mm deep',
      'HPL laminate, matching edge bands',
      'Solid engineered core, 32 mm',
      'Brass knob included',
    ],
  },
  {
    id: 'duet',
    name: 'The Duet',
    cat: 'Laminated',
    tag: 'Book-matched ivory × walnut split with a steel seam',
    story:
      'Half calm ivory, half deep walnut, parted by a brushed-steel seam. Colour-blocking for doors — the two-tone leaf that keeps resurfacing on design boards.',
    motif: 'Two-tone color-block door',
    price: 46500,
    art: 'duet',
    tones: 'wood',
    defaultTone: 'walnut',
    specs: [
      'Dual-laminate face, sealed seam',
      'SS-304 inlay strip',
      'Solid engineered core, 32 mm',
      'Moisture-guard edges',
    ],
  },
  {
    id: 'flute',
    name: 'The Flute',
    cat: 'Laminated',
    tag: 'Full-width fluting in matte colour — sage to navy',
    story:
      'Continuous half-round flutes catch light differently through the day. Fluted texture is the defining door trend of the moment; ours comes in four matte colours.',
    motif: 'Fluted / reeded door',
    price: 36500,
    art: 'flute',
    tones: 'paint',
    defaultTone: 'sage',
    specs: [
      'Machined flutes, 25 mm pitch',
      'Matte PU colour coat',
      'Solid engineered core, 32 mm',
      'Wipe-clean surface',
    ],
  },
  {
    id: 'atrium',
    name: 'The Atrium',
    cat: 'WPC',
    tag: 'Ribbed-glass panel in a black grid, oak WPC frame',
    story:
      'A half-lite of vertical ribbed glass in a slim black grid lets light through and keeps shapes soft — the kitchen-and-study door filling design boards this year. Zero-warp WPC build.',
    motif: 'Ribbed-glass insert door',
    price: 42800,
    art: 'atrium',
    tones: 'wood',
    defaultTone: 'oak',
    specs: [
      'Solid WPC core — waterproof, zero-warp',
      'Toughened ribbed glass, 6 mm',
      'Powder-coated black grid',
      'Ideal for kitchen, study, balcony',
    ],
  },
  {
    id: 'noir',
    name: 'The Noir',
    cat: 'WPC',
    tag: 'Matte black leaf, one long line of brass',
    story:
      'Searches for bold door colours are up 156% — and black leads them all. A light-absorbing matte face, a single 4-foot brass pull, nothing else. WPC core, so it stays perfectly flat.',
    motif: 'Matte black statement door',
    price: 31200,
    art: 'noir',
    tones: 'paint',
    defaultTone: 'black',
    specs: [
      'Solid WPC core — waterproof, termite-proof',
      'Ultra-matte micro-texture coat',
      '1200 mm brass bar pull',
      'Fingerprint resistant',
    ],
  },
  {
    id: 'sentinel',
    name: 'The Sentinel',
    cat: 'Safety',
    tag: 'Steel core in brushed graphite with a smart-lock plate',
    story:
      'A 16-gauge steel core dressed in brushed graphite, seamed like plate armour, with a flush smart-lock panel. Security that looks like architecture, not a cage.',
    motif: 'Industrial steel security door',
    price: 64000,
    art: 'sentinel',
    tones: 'steel',
    defaultTone: 'graphite',
    specs: [
      '16-gauge galvanised steel core',
      '13-point multi-lock, smart-lock ready',
      'Brushed metallic PU finish',
      'Fire-retardant, 60 min rating',
    ],
  },
]

export const CATEGORIES: Array<Category | 'All'> = ['All', 'Series', 'Laminated', 'WPC', 'Safety']

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id)
}

export function tonesFor(product: Product): Tone[] {
  return TONE_GROUPS[product.tones]
}

export function getTone(product: Product, toneId: string): Tone {
  const tones = tonesFor(product)
  return tones.find((t) => t.id === toneId) ?? tones[0]
}

export function getSize(sizeId: string): SizeOption {
  return SIZES.find((s) => s.id === sizeId) ?? SIZES[3]
}

const BASE = getSize(BASE_SIZE_ID)

/** Made-to-measure price: base price scales with leaf area, finish adds a delta. */
export function priceFor(product: Product, sizeId: string, toneId: string): number {
  const size = getSize(sizeId)
  const tone = getTone(product, toneId)
  const areaFactor = (size.widthIn * size.heightIn) / (BASE.widthIn * BASE.heightIn)
  return Math.round((product.price * areaFactor + tone.delta) / 100) * 100
}

/** Featured on the home page. */
export const FEATURED_IDS = ['meridian', 'deco', 'flute'] as const
