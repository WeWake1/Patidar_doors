/**
 * Made-to-measure pricing model for the Designer Studio doors.
 *
 * Shape (borrowed from how door shops actually quote, not from area alone):
 *
 *   1. The customer picks any height × width off the sliders, in ¼″ steps.
 *   2. That size is *snapped up* to the smallest stock panel that covers it —
 *      a leaf is cut from a manufactured board, so 79″ of height costs what
 *      an 81″ board costs. This is why the price climbs in visible steps.
 *   3. Leaf price = a fixed component (labour, edging, hardware fitting, the
 *      measurement visit — none of which shrink with the door) plus a
 *      per-sq-ft component on the snapped area, scaled by thickness.
 *   4. Flat add-ons: back-side design, frame design, hardware/lock.
 *   5. The frame (chaukhat) is priced on running feet at a per-section rate.
 *
 * ⚠️ EVERY NUMBER IN THIS FILE IS A PLACEHOLDER. The rates are back-solved so
 *    that a plain 8′ × 3′ leaf still costs exactly what `product.price` says
 *    today — i.e. nothing changed commercially by shipping the configurator —
 *    and the option deltas are plausible-but-invented. Confirm the whole table
 *    with the client before launch, alongside the copy in CLAUDE.md.
 *
 * Prices are all-inclusive of GST and installation, as the rest of the site
 * presents them; there is deliberately no tax split here.
 */

/* ── slider domain ─────────────────────────────────────── */

export const SIZE_LIMITS = {
  height: { min: 60, max: 96 },
  width: { min: 20, max: 48 },
  /** Quarter-inch, matching how openings are actually measured on site. */
  step: 0.25,
} as const

/* ── the stock panel ladder ────────────────────────────── */

export interface StockPanel {
  heightIn: number
  widthIn: number
  sqft: number
}

/** Manufactured board sizes we can cut a leaf from. ⚠️ placeholder list. */
const STOCK_HEIGHTS = [78, 81, 84, 90, 96]
const STOCK_WIDTHS = [27, 30, 32, 33, 36, 39, 42, 45, 48]

/** Every panel, cheapest (smallest) first — `snapToStock` walks this in order. */
export const STOCK_PANELS: StockPanel[] = STOCK_HEIGHTS.flatMap((heightIn) =>
  STOCK_WIDTHS.map((widthIn) => ({
    heightIn,
    widthIn,
    sqft: Math.round(((heightIn * widthIn) / 144) * 1000) / 1000,
  })),
).sort((a, b) => a.sqft - b.sqft)

const LARGEST = STOCK_PANELS[STOCK_PANELS.length - 1]

/**
 * The panel a given opening is billed on: the smallest one that covers it in
 * both directions. Sizes under the smallest panel bill at the smallest panel —
 * a bathroom door still consumes a whole board.
 */
export function snapToStock(heightIn: number, widthIn: number): StockPanel {
  return STOCK_PANELS.find((p) => p.heightIn >= heightIn && p.widthIn >= widthIn) ?? LARGEST
}

/* ── the option set ────────────────────────────────────── */

export type Thickness = '28mm' | '30mm'
export type BackSide = 'plain' | 'matched'
export type FrameKind = 'none' | 'three' | 'four'
export type FrameSection = '3x2' | '4x2' | '4x2.5'
export type FrameDesign = 'plain' | 'matched'
export type Hardware = 'none' | 'hinges' | 'aldrop' | 'cylindrical'

export interface DoorConfig {
  heightIn: number
  widthIn: number
  thickness: Thickness
  backSide: BackSide
  frame: FrameKind
  frameSection: FrameSection
  frameDesign: FrameDesign
  hardware: Hardware
}

/** 8′ × 3′ plain leaf — the size `product.price` quotes. */
export const DEFAULT_CONFIG: DoorConfig = {
  heightIn: 96,
  widthIn: 36,
  thickness: '30mm',
  backSide: 'plain',
  frame: 'none',
  frameSection: '3x2',
  frameDesign: 'plain',
  hardware: 'none',
}

/* ── the commercial table ──────────────────────────────── */

/** Area `product.price` is quoted at (8′ × 3′ = 24 sq ft). */
const BASE_SQFT = 24

export const PRICING = {
  /**
   * Share of the base price that does NOT scale with area. A small door is
   * not proportionally cheap — the visit, the hanging and the finishing cost
   * the same. 0.27 mirrors the ratio seen on comparable configurators.
   */
  fixedShare: 0.27,
  /** Multiplies the per-sq-ft component only; 30mm is what base prices quote. */
  thicknessFactor: { '30mm': 1, '28mm': 0.82 } satisfies Record<Thickness, number>,
  /** Flat add-ons, ₹. */
  addons: {
    backSideMatched: 1400,
    frameDesignMatched: 1000,
    hardware: { none: 0, hinges: 500, aldrop: 1100, cylindrical: 2000 } satisfies Record<Hardware, number>,
  },
  /** Frame price per running foot, by section (inches). */
  frameRatePerRft: { '3x2': 230, '4x2': 300, '4x2.5': 340 } satisfies Record<FrameSection, number>,
  /**
   * Every computed line is rounded to this — and the add-ons above are all
   * multiples of it — so the breakdown reads in round numbers and its lines
   * sum exactly to the total.
   */
  roundTo: 100,
} as const

export const THICKNESS_OPTIONS: { id: Thickness; label: string; note: string }[] = [
  { id: '30mm', label: '30 mm', note: 'Main doors' },
  { id: '28mm', label: '28 mm', note: 'Rooms & baths' },
]

export const BACK_SIDE_OPTIONS: { id: BackSide; label: string; note: string }[] = [
  { id: 'plain', label: 'Plain back', note: 'Design on the face' },
  { id: 'matched', label: 'Both sides', note: 'Same design behind' },
]

export const FRAME_OPTIONS: { id: FrameKind; label: string; note: string }[] = [
  { id: 'none', label: 'Leaf only', note: 'Reusing your frame' },
  { id: 'three', label: '3-side frame', note: 'Open at the floor' },
  { id: 'four', label: '4-side frame', note: 'Closed, with sill' },
]

export const FRAME_SECTION_OPTIONS: { id: FrameSection; label: string; note: string }[] = [
  { id: '3x2', label: '3″ × 2″', note: 'Slim' },
  { id: '4x2', label: '4″ × 2″', note: 'Standard' },
  { id: '4x2.5', label: '4″ × 2½″', note: 'Heavy' },
]

export const FRAME_DESIGN_OPTIONS: { id: FrameDesign; label: string; note: string }[] = [
  { id: 'plain', label: 'Plain frame', note: 'Finish to match' },
  { id: 'matched', label: 'Matching design', note: 'Carried onto the frame' },
]

export const HARDWARE_OPTIONS: { id: Hardware; label: string; note: string }[] = [
  { id: 'none', label: 'None', note: 'You fit your own' },
  { id: 'hinges', label: 'Hinges only', note: 'SS butt hinges' },
  { id: 'aldrop', label: 'Aldrop + hinges', note: 'Traditional latch' },
  { id: 'cylindrical', label: 'Lock + hinges', note: 'Cylindrical mortise' },
]

/* ── the calculation ───────────────────────────────────── */

export interface PriceLine {
  label: string
  /** ₹, already rounded for display. */
  amount: number
  /** Extra context shown under the label, e.g. the billed panel. */
  note?: string
}

export interface PriceResult {
  total: number
  panel: StockPanel
  /** True when the chosen size had to round up to a bigger panel. */
  snapped: boolean
  /** Running feet of frame, 0 when there is no frame. */
  frameRft: number
  breakdown: PriceLine[]
}

/**
 * Running feet of chaukhat around the opening. A 3-side frame is two verticals
 * plus the head; a 4-side adds the sill. Measured on the leaf, which is close
 * enough for a quote — the exact cut is confirmed at the measurement visit.
 */
export function frameRunningFeet(cfg: DoorConfig): number {
  if (cfg.frame === 'none') return 0
  const h = cfg.heightIn / 12
  const w = cfg.widthIn / 12
  const rft = cfg.frame === 'four' ? 2 * h + 2 * w : 2 * h + w
  return Math.round(rft * 10) / 10
}

const round = (n: number, to: number) => Math.round(n / to) * to

/**
 * Pure price calculation. Takes the anchor price rather than a Product so it
 * stays testable and free of the catalog import cycle.
 *
 * @param basePrice `product.price` — a plain 30mm 8′ × 3′ leaf, installed.
 * @param toneDelta flat ₹ for the chosen finish.
 */
export function calcPrice(basePrice: number, toneDelta: number, cfg: DoorConfig): PriceResult {
  const panel = snapToStock(cfg.heightIn, cfg.widthIn)
  const snapped = panel.heightIn !== cfg.heightIn || panel.widthIn !== cfg.widthIn

  const fixed = basePrice * PRICING.fixedShare
  const variable =
    basePrice * (1 - PRICING.fixedShare) * (panel.sqft / BASE_SQFT) * PRICING.thicknessFactor[cfg.thickness]
  const leaf = fixed + variable

  const breakdown: PriceLine[] = [
    {
      label: `Leaf · ${THICKNESS_OPTIONS.find((t) => t.id === cfg.thickness)?.label}`,
      amount: round(leaf, PRICING.roundTo),
      note: `billed on a ${panel.heightIn}″ × ${panel.widthIn}″ panel — ${panel.sqft} sq ft`,
    },
  ]

  if (toneDelta > 0) breakdown.push({ label: 'Finish', amount: toneDelta })
  if (cfg.backSide === 'matched')
    breakdown.push({ label: 'Same design on the back', amount: PRICING.addons.backSideMatched })

  const frameRft = frameRunningFeet(cfg)
  if (frameRft > 0) {
    const kind = FRAME_OPTIONS.find((f) => f.id === cfg.frame)?.label ?? 'Frame'
    const section = FRAME_SECTION_OPTIONS.find((s) => s.id === cfg.frameSection)
    breakdown.push({
      label: `${kind} · ${section?.label ?? ''}`.trim(),
      amount: round(frameRft * PRICING.frameRatePerRft[cfg.frameSection], PRICING.roundTo),
      note: `${frameRft} running ft`,
    })
    if (cfg.frameDesign === 'matched')
      breakdown.push({ label: 'Matching design on the frame', amount: PRICING.addons.frameDesignMatched })
  }

  if (cfg.hardware !== 'none') {
    breakdown.push({
      label: HARDWARE_OPTIONS.find((h) => h.id === cfg.hardware)?.label ?? 'Hardware',
      amount: PRICING.addons.hardware[cfg.hardware],
    })
  }

  // Each line is rounded where it is computed and the total is their plain
  // sum — never a second rounding, or the printed breakdown stops adding up.
  const total = breakdown.reduce((a, l) => a + l.amount, 0)
  return { total, panel, snapped, frameRft, breakdown }
}

/* ── size ids, labels and cart keys ────────────────────── */

const FRACTIONS = ['', '¼', '½', '¾']

function quarters(v: number): [number, number] {
  let whole = Math.floor(v)
  let q = Math.round((v - whole) * 4)
  if (q === 4) {
    whole += 1
    q = 0
  }
  return [whole, q]
}

/** 32.25 → `32¼″` */
export function formatInches(v: number): string {
  const [whole, q] = quarters(v)
  return `${whole}${FRACTIONS[q]}″`
}

/** 78.25 → `6′6¼″` */
export function formatFtIn(v: number): string {
  const ft = Math.floor(v / 12)
  const rest = v - ft * 12
  return rest < 0.01 ? `${ft}′` : `${ft}′${formatInches(rest)}`
}

/** `6′6¼″ × 2′8″` — how a customer reads a door. */
export function formatSizeLabel(heightIn: number, widthIn: number): string {
  return `${formatFtIn(heightIn)} × ${formatFtIn(widthIn)}`
}

/** `78¼″ × 32″` — how the workshop cuts one. Both go on the order. */
export function formatSizeInches(heightIn: number, widthIn: number): string {
  return `${formatInches(heightIn)} × ${formatInches(widthIn)}`
}

/**
 * Cart/catalog size id, `height x width` in inches — the same shape the old
 * fixed `SIZES` ids used (`'84x33'`), so carts saved before the configurator
 * still parse and price correctly.
 */
export function toSizeId(heightIn: number, widthIn: number): string {
  return `${heightIn}x${widthIn}`
}

export function parseSizeId(sizeId: string): { heightIn: number; widthIn: number } | null {
  const m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(sizeId)
  if (!m) return null
  const heightIn = Number(m[1])
  const widthIn = Number(m[2])
  if (!Number.isFinite(heightIn) || !Number.isFinite(widthIn)) return null
  return { heightIn, widthIn }
}

/** The non-size options, for the cart line key. Empty string when all default. */
export function configKey(cfg: DoorConfig): string {
  const parts = [
    cfg.thickness === DEFAULT_CONFIG.thickness ? '' : cfg.thickness,
    cfg.backSide === DEFAULT_CONFIG.backSide ? '' : `back-${cfg.backSide}`,
    cfg.frame === DEFAULT_CONFIG.frame ? '' : `frame-${cfg.frame}-${cfg.frameSection}-${cfg.frameDesign}`,
    cfg.hardware === DEFAULT_CONFIG.hardware ? '' : `hw-${cfg.hardware}`,
  ].filter(Boolean)
  return parts.join('.')
}

/** Human summary of the non-size options, e.g. `30 mm · 3-side frame · Aldrop + hinges`. */
export function describeConfig(cfg: DoorConfig): string {
  const parts: string[] = [THICKNESS_OPTIONS.find((t) => t.id === cfg.thickness)?.label ?? cfg.thickness]
  if (cfg.backSide === 'matched') parts.push('design both sides')
  if (cfg.frame !== 'none') {
    const kind = FRAME_OPTIONS.find((f) => f.id === cfg.frame)?.label ?? 'frame'
    const section = FRAME_SECTION_OPTIONS.find((s) => s.id === cfg.frameSection)?.label ?? ''
    parts.push(`${kind} ${section}`.trim() + (cfg.frameDesign === 'matched' ? ', matching design' : ''))
  }
  if (cfg.hardware !== 'none') parts.push(HARDWARE_OPTIONS.find((h) => h.id === cfg.hardware)?.label ?? cfg.hardware)
  return parts.join(' · ')
}

/** Rebuild a full config from a stored cart line. */
export function configFromLine(sizeId: string, stored?: Partial<DoorConfig>): DoorConfig {
  const size = parseSizeId(sizeId)
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    heightIn: size?.heightIn ?? DEFAULT_CONFIG.heightIn,
    widthIn: size?.widthIn ?? DEFAULT_CONFIG.widthIn,
  }
}
