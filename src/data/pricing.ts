/**
 * Made-to-measure pricing for the doors the site sells outright.
 *
 * ── where the numbers live ──────────────────────────────────────────────
 * Until 2026-09-15 every rate except the headline price was a constant in
 * this file — a 27 % "fixed share", a thickness factor, three frame rates,
 * four hardware prices — and the admin could set exactly one number per door.
 * The client could not type their own rate card in. Now the numbers are data,
 * in two places that match how a door shop actually quotes:
 *
 *   • the PRICE BOOK (`PriceBook`, one row in the `settings` table, edited on
 *     /admin/pricing) — everything that does not depend on which door: frame
 *     (chaukhat) types by ₹ per running foot, hardware sets, a fitting charge,
 *     the sizes the sliders allow, the optional stock-board ladder, rounding.
 *   • the DOOR (`DoorPricing`, `products.pricing` jsonb, edited inside the
 *     product editor) — its own base rate, in the unit the owner quotes in
 *     (₹ per sq ft, or ₹ per leaf at a reference size), plus option groups
 *     (thickness, back side, anything else) whose choices carry an extra, and
 *     which of the book's frames and hardware this door is offered with.
 *
 * `calcPrice` is the one quote function; the storefront, the cart and the
 * admin's "what a customer pays" panel all call it, so the three can never
 * disagree. Both shapes are versioned and *parsed*, never trusted — they come
 * out of jsonb the owner edits through a form, and a stale or hand-edited row
 * must degrade to a default, not to `NaN` in the WhatsApp order.
 *
 * ⚠️ `DEFAULT_PRICE_BOOK` and `placeholderPricing()` carry the same invented
 *    placeholders the old constants did (frames 230/300/340 per rft, hardware
 *    500/1100/2000, boards 78–96 × 27–48). They are what the site quotes with
 *    until the client types real numbers into /admin — and a plain 8′ × 3′
 *    leaf still costs exactly the placeholder headline, so nothing moved
 *    commercially when the model changed.
 *
 * Prices are all-inclusive of GST and installation, as the rest of the site
 * presents them; there is deliberately no tax split here.
 */

/* ═══════════════ the price book (shop-wide) ═══════════════════════════ */

export interface FrameType {
  id: string
  /** e.g. `Teak 4″ × 2½″` */
  name: string
  note?: string
  /** ₹ per running foot of chaukhat. */
  ratePerRft: number
}

export interface HardwareSet {
  id: string
  /** e.g. `Aldrop + hinges` */
  name: string
  note?: string
  /** ₹ per door, flat. */
  price: number
}

export interface SizeRange {
  min: number
  max: number
}

export interface PriceBook {
  v: 1
  frames: FrameType[]
  /** Flat ₹ for carrying the door's design onto the frame; 0 = not offered. */
  frameDesignExtra: number
  hardware: HardwareSet[]
  /** Flat ₹ per door for the measurement visit + hanging; 0 = none. */
  fitting: number
  /** What the size sliders allow, in inches. Quarter-inch steps. */
  limits: { height: SizeRange; width: SizeRange }
  /**
   * The optional stock-board ladder. When enabled, a chosen size is rounded
   * UP to the smallest board that covers it in both directions and billed on
   * that — a leaf cut from a manufactured board costs what the board costs, so
   * prices climb in steps. Off, the exact area is billed.
   */
  boards: { enabled: boolean; heights: number[]; widths: number[] }
  /** Every computed line is rounded to this, so the breakdown reads in round numbers. */
  roundTo: number
}

/** ⚠️ Placeholder numbers — see the header. */
export const DEFAULT_PRICE_BOOK: PriceBook = {
  v: 1,
  frames: [
    { id: '3x2', name: '3″ × 2″', note: 'Slim', ratePerRft: 230 },
    { id: '4x2', name: '4″ × 2″', note: 'Standard', ratePerRft: 300 },
    { id: '4x2.5', name: '4″ × 2½″', note: 'Heavy', ratePerRft: 340 },
  ],
  frameDesignExtra: 1000,
  hardware: [
    { id: 'hinges', name: 'Hinges only', note: 'SS butt hinges', price: 500 },
    { id: 'aldrop', name: 'Aldrop + hinges', note: 'Traditional latch', price: 1100 },
    { id: 'cylindrical', name: 'Lock + hinges', note: 'Cylindrical mortise', price: 2000 },
  ],
  fitting: 0,
  limits: { height: { min: 60, max: 96 }, width: { min: 20, max: 48 } },
  boards: { enabled: true, heights: [78, 81, 84, 90, 96], widths: [27, 30, 32, 33, 36, 39, 42, 45, 48] },
  roundTo: 100,
}

/** Quarter-inch, matching how openings are actually measured on site. */
export const SIZE_STEP = 0.25

/* ═══════════════ one door's pricing ═══════════════════════════════════ */

/** The unit every ₹ rate on a door is expressed in. */
export type RateUnit = 'sqft' | 'leaf'

export interface OptionChoice {
  id: string
  /** e.g. `32 mm`, `Design both sides` */
  label: string
  note?: string
  /**
   * ₹ on top of the base. `per: 'door'` is a flat amount; `per: 'unit'` is in
   * the same unit as the door's base rate (per sq ft, or per leaf at the
   * reference size) and scales with the area the way the base does. The first
   * choice of a group is the one included in the base price; its extra is 0.
   */
  extra: number
  per: 'door' | 'unit'
}

export interface OptionGroup {
  id: string
  /** e.g. `Thickness`, `Back side` */
  label: string
  /** First = included. A group with one choice is not shown to the customer. */
  choices: OptionChoice[]
}

export interface DoorPricing {
  v: 1
  unit: RateUnit
  /** The leaf a per-leaf rate describes; also the size the headline quotes. */
  ref: { heightIn: number; widthIn: number }
  /** ₹ per `unit` for the door with every group's first choice. */
  base: number
  groups: OptionGroup[]
  /** Frame types (price-book ids) this door is offered with; `'all'` = every one. */
  frames: 'all' | string[]
  /** Hardware sets (price-book ids) this door is offered with; `'all'` = every one. */
  hardware: 'all' | string[]
}

/** 8′ × 3′ — the leaf a headline price has always quoted on this site. */
export const DEFAULT_REF = { heightIn: 96, widthIn: 36 } as const

/**
 * Build a door's pricing from a bare headline price — how the 17 placeholder
 * prices in products.ts become configurable until the client types a rate.
 * The two groups are the ones the old constants hard-coded: 30 mm included
 * with 28 mm ~18 % cheaper, and a matched back at ₹1,400.
 */
export function placeholderPricing(headline: number): DoorPricing {
  return {
    v: 1,
    unit: 'leaf',
    ref: { ...DEFAULT_REF },
    base: headline,
    groups: [
      {
        id: 'thickness',
        label: 'Thickness',
        choices: [
          { id: '30mm', label: '30 mm', note: 'Main doors', extra: 0, per: 'unit' },
          { id: '28mm', label: '28 mm', note: 'Rooms & baths', extra: -Math.round((headline * 0.18) / 100) * 100, per: 'unit' },
        ],
      },
      {
        id: 'back',
        label: 'Back side',
        choices: [
          { id: 'plain', label: 'Plain back', note: 'Design on the face', extra: 0, per: 'door' },
          { id: 'matched', label: 'Both sides', note: 'Same design behind', extra: 1400, per: 'door' },
        ],
      },
    ],
    frames: 'all',
    hardware: 'all',
  }
}

/** The two presets the admin offers with one tap. */
export const GROUP_PRESETS: OptionGroup[] = [
  {
    id: 'thickness',
    label: 'Thickness',
    choices: [
      { id: '30mm', label: '30 mm', note: 'Main doors', extra: 0, per: 'unit' },
      { id: '32mm', label: '32 mm', note: 'Heavier', extra: 0, per: 'unit' },
    ],
  },
  {
    id: 'back',
    label: 'Back side',
    choices: [
      { id: 'plain', label: 'Plain back', note: 'Design on the face', extra: 0, per: 'door' },
      { id: 'matched', label: 'Both sides', note: 'Same design behind', extra: 0, per: 'door' },
    ],
  },
]

/* ═══════════════ parsing (nothing trusts jsonb) ═══════════════════════ */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const num = (v: unknown, fallback: number, min = -Infinity): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min ? v : fallback
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '')

function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((it) => {
    if (!it.id || seen.has(it.id)) return false
    seen.add(it.id)
    return true
  })
}

function parseRange(v: unknown, fallback: SizeRange): SizeRange {
  if (!isObj(v)) return fallback
  const min = num(v.min, fallback.min, 1)
  const max = num(v.max, fallback.max, 1)
  return max > min ? { min, max } : fallback
}

function parseInches(v: unknown, fallback: number[]): number[] {
  if (!Array.isArray(v)) return fallback
  const out = [...new Set(v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0))]
  return out.length ? out.sort((a, b) => a - b) : fallback
}

/** A price book from whatever the settings row holds; every field falls back on its own. */
export function parsePriceBook(raw: unknown): PriceBook {
  const d = DEFAULT_PRICE_BOOK
  if (!isObj(raw)) return d
  const frames = Array.isArray(raw.frames)
    ? uniqueIds(
        raw.frames.filter(isObj).map((f) => ({
          id: str(f.id) || slug(str(f.name)),
          name: str(f.name).trim(),
          ...(str(f.note).trim() ? { note: str(f.note).trim() } : {}),
          ratePerRft: num(f.ratePerRft, 0, 0),
        })),
      ).filter((f) => f.name)
    : d.frames
  const hardware = Array.isArray(raw.hardware)
    ? uniqueIds(
        raw.hardware.filter(isObj).map((h) => ({
          id: str(h.id) || slug(str(h.name)),
          name: str(h.name).trim(),
          ...(str(h.note).trim() ? { note: str(h.note).trim() } : {}),
          price: num(h.price, 0, 0),
        })),
      ).filter((h) => h.name)
    : d.hardware
  const limits = isObj(raw.limits)
    ? { height: parseRange(raw.limits.height, d.limits.height), width: parseRange(raw.limits.width, d.limits.width) }
    : d.limits
  const boards = isObj(raw.boards)
    ? {
        enabled: raw.boards.enabled === true,
        heights: parseInches(raw.boards.heights, d.boards.heights),
        widths: parseInches(raw.boards.widths, d.boards.widths),
      }
    : d.boards
  return {
    v: 1,
    frames,
    frameDesignExtra: num(raw.frameDesignExtra, d.frameDesignExtra, 0),
    hardware,
    fitting: num(raw.fitting, d.fitting, 0),
    limits,
    boards,
    roundTo: Math.max(1, Math.round(num(raw.roundTo, d.roundTo, 1))),
  }
}

/**
 * One door's pricing from its jsonb, or null when the row carries nothing
 * usable — a null is "not priced", which the storefront shows as enquiry.
 */
export function parseDoorPricing(raw: unknown): DoorPricing | null {
  if (!isObj(raw)) return null
  const base = num(raw.base, NaN, 0)
  if (!Number.isFinite(base) || base <= 0) return null
  const unit: RateUnit = raw.unit === 'sqft' ? 'sqft' : 'leaf'
  const ref = isObj(raw.ref)
    ? { heightIn: num(raw.ref.heightIn, DEFAULT_REF.heightIn, 1), widthIn: num(raw.ref.widthIn, DEFAULT_REF.widthIn, 1) }
    : { ...DEFAULT_REF }
  const groups: OptionGroup[] = Array.isArray(raw.groups)
    ? uniqueIds(
        raw.groups.filter(isObj).map((g) => ({
          id: str(g.id) || slug(str(g.label)),
          label: str(g.label).trim(),
          choices: Array.isArray(g.choices)
            ? uniqueIds(
                g.choices.filter(isObj).map((c) => ({
                  id: str(c.id) || slug(str(c.label)),
                  label: str(c.label).trim(),
                  ...(str(c.note).trim() ? { note: str(c.note).trim() } : {}),
                  extra: num(c.extra, 0),
                  per: c.per === 'unit' ? ('unit' as const) : ('door' as const),
                })),
              ).filter((c) => c.label)
            : [],
        })),
      ).filter((g) => g.label && g.choices.length > 0)
    : []
  const ids = (v: unknown): 'all' | string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : 'all'
  return { v: 1, unit, ref, base, groups, frames: ids(raw.frames), hardware: ids(raw.hardware) }
}

/* ═══════════════ the customer's configuration ═════════════════════════ */

export type FrameKind = 'none' | 'three' | 'four'
export type FrameDesign = 'plain' | 'matched'

export interface DoorConfig {
  heightIn: number
  widthIn: number
  /** group id → chosen choice id */
  choices: Record<string, string>
  frame: FrameKind
  /** A price-book frame type id (meaningful only when `frame !== 'none'`). */
  frameType: string
  frameDesign: FrameDesign
  /** A price-book hardware id, or `'none'`. */
  hardware: string
}

export const FRAME_OPTIONS: { id: FrameKind; label: string; note: string }[] = [
  { id: 'none', label: 'Leaf only', note: 'Reusing your frame' },
  { id: 'three', label: '3-side frame', note: 'Open at the floor' },
  { id: 'four', label: '4-side frame', note: 'Closed, with sill' },
]

export const FRAME_DESIGN_OPTIONS: { id: FrameDesign; label: string; note: string }[] = [
  { id: 'plain', label: 'Plain frame', note: 'Finish to match' },
  { id: 'matched', label: 'Matching design', note: 'Carried onto the frame' },
]

/** The "fit your own" hardware choice, always offered first. */
export const NO_HARDWARE: HardwareSet = { id: 'none', name: 'None', note: 'You fit your own', price: 0 }

/** The frame types this door is offered with, in price-book order. */
export function framesFor(pricing: DoorPricing, book: PriceBook): FrameType[] {
  if (pricing.frames === 'all') return book.frames
  const allowed = new Set(pricing.frames)
  return book.frames.filter((f) => allowed.has(f.id))
}

/** The hardware this door is offered with, "None" first. */
export function hardwareFor(pricing: DoorPricing, book: PriceBook): HardwareSet[] {
  const sets = pricing.hardware === 'all' ? book.hardware : book.hardware.filter((h) => new Set(pricing.hardware).has(h.id))
  return [NO_HARDWARE, ...sets]
}

/** The door as shown: reference size, every group's first choice, leaf only, no hardware. */
export function defaultConfig(pricing: DoorPricing, book: PriceBook): DoorConfig {
  return normalizeConfig(pricing, book, {
    heightIn: pricing.ref.heightIn,
    widthIn: pricing.ref.widthIn,
    choices: {},
    frame: 'none',
    frameType: '',
    frameDesign: 'plain',
    hardware: 'none',
  })
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
const snapStep = (v: number) => Math.round(v / SIZE_STEP) * SIZE_STEP

/**
 * Every field checked against what this door and the book actually offer;
 * anything else becomes the default. This is what a stored cart line, a URL
 * and the live price book landing under an open configurator all go through,
 * so an option renamed in /admin can never reach `calcPrice` as `undefined`.
 */
export function normalizeConfig(pricing: DoorPricing, book: PriceBook, cfg: Partial<DoorConfig>): DoorConfig {
  const choices: Record<string, string> = {}
  for (const g of pricing.groups) {
    const want = cfg.choices?.[g.id]
    choices[g.id] = g.choices.some((c) => c.id === want) ? (want as string) : g.choices[0].id
  }
  const frames = framesFor(pricing, book)
  const frame: FrameKind = frames.length && (cfg.frame === 'three' || cfg.frame === 'four') ? cfg.frame : 'none'
  const frameType = frames.some((f) => f.id === cfg.frameType) ? (cfg.frameType as string) : (frames[0]?.id ?? '')
  const frameDesign: FrameDesign = book.frameDesignExtra > 0 && cfg.frameDesign === 'matched' ? 'matched' : 'plain'
  const hardware = hardwareFor(pricing, book).some((h) => h.id === cfg.hardware) ? (cfg.hardware as string) : 'none'
  return {
    heightIn: snapStep(clamp(num(cfg.heightIn, pricing.ref.heightIn), book.limits.height.min, book.limits.height.max)),
    widthIn: snapStep(clamp(num(cfg.widthIn, pricing.ref.widthIn), book.limits.width.min, book.limits.width.max)),
    choices,
    frame,
    frameType,
    frameDesign,
    hardware,
  }
}

/* ═══════════════ the calculation ══════════════════════════════════════ */

export interface PriceLine {
  label: string
  /** ₹, already rounded for display. */
  amount: number
  /** Extra context shown under the label, e.g. the billed panel. */
  note?: string
}

export interface StockPanel {
  heightIn: number
  widthIn: number
  sqft: number
}

export interface PriceResult {
  total: number
  /** Square feet the leaf was billed on (exact, or the board's when snapping). */
  area: number
  /** The board billed on, when the book snaps to stock boards. */
  panel: StockPanel | null
  /** True when the chosen size had to round up to a bigger board. */
  snapped: boolean
  /** Running feet of frame, 0 when there is no frame. */
  frameRft: number
  breakdown: PriceLine[]
}

const sqftOf = (h: number, w: number) => Math.round(((h * w) / 144) * 1000) / 1000

/**
 * The board a size is billed on: the smallest that covers it in both
 * directions, or the largest when nothing does. Sizes under the smallest board
 * bill at the smallest board — a bathroom door still consumes a whole board.
 */
export function snapToStock(book: PriceBook, heightIn: number, widthIn: number): StockPanel {
  const panels = book.boards.heights
    .flatMap((h) => book.boards.widths.map((w) => ({ heightIn: h, widthIn: w, sqft: sqftOf(h, w) })))
    .sort((a, b) => a.sqft - b.sqft)
  return panels.find((p) => p.heightIn >= heightIn && p.widthIn >= widthIn) ?? panels[panels.length - 1]
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

/** A rate in the door's own unit, as ₹ per square foot. */
function perSqft(pricing: DoorPricing, rate: number): number {
  return pricing.unit === 'sqft' ? rate : rate / sqftOf(pricing.ref.heightIn, pricing.ref.widthIn)
}

/**
 * The one quote. Pure: the door's pricing, the book, the configuration.
 *
 * Each line is rounded where it is computed and the total is their plain
 * sum — never a second rounding, or the printed breakdown stops adding up.
 */
export function calcPrice(pricing: DoorPricing, book: PriceBook, input: DoorConfig): PriceResult {
  const cfg = normalizeConfig(pricing, book, input)
  const to = book.roundTo

  const panel = book.boards.enabled ? snapToStock(book, cfg.heightIn, cfg.widthIn) : null
  const area = panel ? panel.sqft : sqftOf(cfg.heightIn, cfg.widthIn)
  const snapped = !!panel && (panel.heightIn !== cfg.heightIn || panel.widthIn !== cfg.widthIn)

  const chosen = pricing.groups.map((g) => g.choices.find((c) => c.id === cfg.choices[g.id]) ?? g.choices[0])
  let rate = perSqft(pricing, pricing.base)
  const leafNotes: string[] = []
  for (const c of chosen) {
    if (c.per !== 'unit') continue
    rate += perSqft(pricing, c.extra)
    leafNotes.push(c.label)
  }

  const breakdown: PriceLine[] = [
    {
      label: leafNotes.length ? `Leaf · ${leafNotes.join(' · ')}` : 'Leaf',
      amount: round(rate * area, to),
      note: panel
        ? `billed on a ${panel.heightIn}″ × ${panel.widthIn}″ board — ${panel.sqft} sq ft`
        : `${area} sq ft`,
    },
  ]

  for (const c of chosen) {
    if (c.per === 'door' && c.extra !== 0) breakdown.push({ label: c.label, amount: round(c.extra, to) })
  }

  const frameRft = frameRunningFeet(cfg)
  if (frameRft > 0) {
    const kind = FRAME_OPTIONS.find((f) => f.id === cfg.frame)?.label ?? 'Frame'
    const type = framesFor(pricing, book).find((f) => f.id === cfg.frameType)
    breakdown.push({
      label: `${kind} · ${type?.name ?? ''}`.trim(),
      amount: round(frameRft * (type?.ratePerRft ?? 0), to),
      note: `${frameRft} running ft`,
    })
    if (cfg.frameDesign === 'matched')
      breakdown.push({ label: 'Matching design on the frame', amount: round(book.frameDesignExtra, to) })
  }

  if (cfg.hardware !== 'none') {
    const hw = hardwareFor(pricing, book).find((h) => h.id === cfg.hardware)
    if (hw) breakdown.push({ label: hw.name, amount: round(hw.price, to) })
  }

  if (book.fitting > 0) breakdown.push({ label: 'Measurement & fitting', amount: round(book.fitting, to) })

  const total = breakdown.reduce((a, l) => a + l.amount, 0)
  return { total, area, panel, snapped, frameRft, breakdown }
}

/**
 * The "from ₹" a card shows: the door at its reference size with every
 * group's first choice, leaf only. Needs no book — frames, hardware and
 * fitting are not in it — so the row→Product mapper can derive it.
 */
export function headlinePrice(pricing: DoorPricing): number {
  const area = sqftOf(pricing.ref.heightIn, pricing.ref.widthIn)
  const perDoor = pricing.groups.reduce((a, g) => a + (g.choices[0].per === 'door' ? g.choices[0].extra : 0), 0)
  const perUnit = pricing.groups.reduce((a, g) => a + (g.choices[0].per === 'unit' ? g.choices[0].extra : 0), 0)
  return Math.round(perSqft(pricing, pricing.base + perUnit) * area + perDoor)
}

/* ═══════════════ size ids, labels and cart keys ═══════════════════════ */

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

/**
 * The non-size options, for the cart line key. Empty string when everything
 * is at its default, so a plain door's key is just `product|size|tone`.
 */
export function configKey(pricing: DoorPricing, cfg: DoorConfig): string {
  const parts: string[] = []
  for (const g of pricing.groups) {
    const chosen = cfg.choices[g.id]
    if (chosen && chosen !== g.choices[0].id) parts.push(`${g.id}:${chosen}`)
  }
  if (cfg.frame !== 'none') parts.push(`frame-${cfg.frame}-${cfg.frameType}-${cfg.frameDesign}`)
  if (cfg.hardware !== 'none') parts.push(`hw-${cfg.hardware}`)
  return parts.join('.')
}

/** Human summary of the non-size options, e.g. `30 mm · Plain back · 3-side frame 4″ × 2″ · Aldrop + hinges`. */
export function describeConfig(pricing: DoorPricing, book: PriceBook, cfg: DoorConfig): string {
  const parts: string[] = []
  for (const g of pricing.groups) {
    const c = g.choices.find((x) => x.id === cfg.choices[g.id]) ?? g.choices[0]
    parts.push(c.label)
  }
  if (cfg.frame !== 'none') {
    const kind = FRAME_OPTIONS.find((f) => f.id === cfg.frame)?.label ?? 'frame'
    const type = framesFor(pricing, book).find((f) => f.id === cfg.frameType)?.name ?? ''
    parts.push(`${kind} ${type}`.trim() + (cfg.frameDesign === 'matched' ? ', matching design' : ''))
  }
  if (cfg.hardware !== 'none') {
    const hw = hardwareFor(pricing, book).find((h) => h.id === cfg.hardware)
    if (hw) parts.push(hw.name)
  }
  return parts.join(' · ')
}

/**
 * Rebuild a full config from a stored cart line.
 *
 * A cart line is `localStorage` — it outlives redeploys that rename an option,
 * and it can be edited by hand — so every field is checked against the options
 * we actually sell rather than spread in (`normalizeConfig`). Lines written
 * before 2026-09-15 carried `thickness`/`backSide`/`frameSection` as top-level
 * fields; those map onto the placeholder groups' ids, so an old cart still
 * prices the door it held.
 */
export function configFromLine(
  pricing: DoorPricing,
  book: PriceBook,
  sizeId: string,
  stored?: Partial<DoorConfig> | Record<string, unknown>,
): DoorConfig {
  const size = parseSizeId(sizeId)
  const s = (stored ?? {}) as Record<string, unknown>
  const choices: Record<string, string> = isObj(s.choices)
    ? Object.fromEntries(Object.entries(s.choices).filter((e): e is [string, string] => typeof e[1] === 'string'))
    : {}
  if (typeof s.thickness === 'string' && !choices.thickness) choices.thickness = s.thickness
  if (typeof s.backSide === 'string' && !choices.back) choices.back = s.backSide
  return normalizeConfig(pricing, book, {
    heightIn: size?.heightIn,
    widthIn: size?.widthIn,
    choices,
    frame: s.frame as FrameKind,
    frameType: typeof s.frameType === 'string' ? s.frameType : typeof s.frameSection === 'string' ? s.frameSection : '',
    frameDesign: s.frameDesign as FrameDesign,
    hardware: typeof s.hardware === 'string' ? s.hardware : 'none',
  })
}
