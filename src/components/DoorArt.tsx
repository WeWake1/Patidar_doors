/**
 * The one drawn door leaf left on the site: `classic`.
 *
 * There were thirteen — the twelve "Designer Studio" designs plus this one —
 * until 2026-08-20, when the catalogue designs were removed: they were
 * original artwork drafted as placeholders while the client's photography was
 * pending, and a store whose whole purpose is footfall cannot front doors its
 * shop floor does not stock. `classic` is not a catalogue design and never
 * was. It is the archetypal panelled leaf, and it survives for two jobs
 * neither of which is a product: the hero corridor's Doors card, which slices
 * it like a texture, and the stand-in for a real door whose photograph has not
 * been shot yet.
 *
 * It is drawn in a 300 × 800 viewBox (≈ 3′ × 8′) and tinted by a wood `Tone`.
 * Realism comes from striped overlays warped by a shared feTurbulence
 * displacement filter (see <DoorArtDefs/>, mounted once in App).
 */
import { useMemo, type ReactNode } from 'react'
import type { ArtId, Tone } from '../data/products'

export const LEAF_W = 300
export const LEAF_H = 800

const BRASS = { hi: '#EDD49B', mid: '#C9A964', lo: '#8F6F3C' }

let uidCounter = 0

/**
 * Shared filters/gradients referenced by every door. Mount once, app-wide.
 *
 * The `id` is a contract, not decoration: an SVG serialised into an <img> is a
 * separate document, so `url(#dw-grain)` resolves to nothing there and every
 * wood door would rasterise as flat, un-grained stripes. `src/lib/doorRaster.ts`
 * finds this node by id and inlines its children into the copy it exports.
 */
export function DoorArtDefs() {
  return (
    <svg id="dw-defs" width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {/* wavy wood-grain warp */}
        <filter id="dw-grain" x="-6%" y="-3%" width="112%" height="106%">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.11" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* fine mottle for aged / distressed surfaces */}
        <filter id="dw-mottle" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.14 0.1" numOctaves="3" seed="11" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.7 0 0 0 0"
          />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
        {/* brushed-metal vertical streaks */}
        <filter id="dw-brush" x="-4%" y="-2%" width="108%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.004" numOctaves="2" seed="4" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.14 0 0 0 0"
          />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>
    </svg>
  )
}

/* ── deterministic pseudo-random, so grain is stable between renders ────── */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Vertical grain stripes, later warped by the shared displacement filter. */
function GrainStripes({ tone, seed = 3, opacity = 0.5 }: { tone: Tone; seed?: number; opacity?: number }) {
  const stripes = useMemo(() => {
    const rnd = mulberry32(seed)
    const out: Array<{ x: number; w: number; o: number; dark: boolean }> = []
    let x = 4
    while (x < LEAF_W - 4) {
      const w = 1 + rnd() * 2.4
      out.push({ x, w, o: 0.12 + rnd() * 0.24, dark: rnd() > 0.3 })
      x += 6 + rnd() * 16
    }
    return out
  }, [seed])
  if (!tone.grain) return null
  return (
    <g filter="url(#dw-grain)" opacity={opacity}>
      {stripes.map((s, i) => (
        <rect
          key={i}
          x={s.x}
          y={-10}
          width={s.w}
          height={LEAF_H + 20}
          fill={s.dark ? tone.dark : tone.light}
          opacity={s.o}
        />
      ))}
    </g>
  )
}

function WoodBase({ uid, tone, seed = 3 }: { uid: string; tone: Tone; seed?: number }) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={tone.dark} />
          <stop offset="0.12" stopColor={tone.base} />
          <stop offset="0.5" stopColor={tone.light} stopOpacity="0.9" />
          <stop offset="0.88" stopColor={tone.base} />
          <stop offset="1" stopColor={tone.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={LEAF_W} height={LEAF_H} fill={tone.base} />
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-base)`} opacity="0.85" />
      <GrainStripes tone={tone} seed={seed} />
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-sheen)`} />
    </>
  )
}

/** Inner edge shading so the leaf reads as a solid slab. */
function EdgeShade() {
  return (
    <>
      <rect x="0" y="0" width={LEAF_W} height={LEAF_H} fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth="3" />
      <rect x="1.5" y="1.5" width={LEAF_W - 3} height={LEAF_H - 3} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
    </>
  )
}

function BarPull({
  uid,
  x,
  y,
  h,
  w = 6,
  metal = BRASS,
}: {
  uid: string
  x: number
  y: number
  h: number
  w?: number
  metal?: typeof BRASS
}) {
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-pull`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={metal.hi} />
          <stop offset="0.5" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.lo} />
        </linearGradient>
      </defs>
      <rect x={x + 1.5} y={y + 3} width={w} height={h} rx={w / 2} fill="rgba(0,0,0,0.35)" />
      <rect x={x} y={y} width={w} height={h} rx={w / 2} fill={`url(#${uid}-pull)`} />
      <rect x={x + w * 0.22} y={y + 4} width={w * 0.22} height={h - 8} rx={w * 0.11} fill="#fff" opacity="0.35" />
    </>
  )
}

/* ══════════════════════════ the designs ══════════════════════════ */

/** Hero door — twin recessed panels, the archetypal leaf. */
function Classic({ uid, tone }: { uid: string; tone: Tone }) {
  const panel = (y: number, h: number) => (
    <g key={y}>
      <rect x="42" y={y} width="216" height={h} fill="rgba(0,0,0,0.16)" />
      <rect x="42" y={y} width="216" height={h} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" />
      <rect x="46" y={y + 4} width="208" height={h - 8} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" />
      <rect x="56" y={y + 14} width="188" height={h - 28} fill="rgba(255,255,255,0.05)" />
    </g>
  )
  return (
    <>
      <WoodBase uid={uid} tone={tone} seed={5} />
      {panel(64, 310)}
      {panel(424, 310)}
      <BarPull uid={uid} x={268} y={356} h={88} w={7} />
      <EdgeShade />
    </>
  )
}

const DESIGNS: Record<ArtId, (p: { uid: string; tone: Tone }) => ReactNode> = {
  classic: (p) => <Classic {...p} />,
}

export function DoorArt({
  art,
  tone,
  className,
  style,
}: {
  art: ArtId
  tone: Tone
  className?: string
  style?: React.CSSProperties
}) {
  const uid = useMemo(() => `dw${uidCounter++}`, [])
  return (
    <svg
      viewBox={`0 0 ${LEAF_W} ${LEAF_H}`}
      className={className}
      style={style}
      role="img"
      aria-label={`Door design in ${tone.name}`}
      preserveAspectRatio="none"
    >
      {DESIGNS[art]({ uid, tone })}
    </svg>
  )
}
