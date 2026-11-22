/**
 * Generated material swatches for non-door products — timber planks, ply
 * strata, WPC boards — drawn in a 400 × 300 viewBox and tinted per product.
 * Reuses the shared `dw-grain` displacement filter from <DoorArtDefs/>.
 */
import { useMemo } from 'react'

const W = 400
const H = 300

interface MaterialColors {
  base: string
  dark: string
  light: string
}

let uidCounter = 0

function useUid(): string {
  return useMemo(() => `mt${++uidCounter}`, [])
}

/**
 * Two boards of the same species are never the same board. The swatch geometry
 * below is fixed, so without this every Burmese Teak, Gana Teak and Commercial
 * Teak card drew the identical rectangle — four of them in a row on `/timbers`,
 * eleven down `/shop`, and a grid of photocopies reads as a placeholder rather
 * than as stock. `seed` is the product id, so a given board looks the same on
 * every render, on the card and on the PDP, and in the admin preview.
 *
 * A hash, not `Math.random`: the art has to be stable across re-renders and
 * identical between the card and the page it opens.
 */
function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A deterministic 0–1 stream off one seed. */
function rng(seed: string): () => number {
  let s = hash(seed) || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

/** End-grain growth rings, used on timber. */
function EndGrain({ cx, cy, r, colors }: { cx: number; cy: number; r: number; colors: MaterialColors }) {
  const rings = []
  for (let rr = r; rr > 3; rr -= r / 6) {
    rings.push(rr)
  }
  return (
    <g filter="url(#dw-grain)">
      <circle cx={cx} cy={cy} r={r} fill={colors.light} />
      {rings.map((rr, i) => (
        <circle key={i} cx={cx} cy={cy} r={rr} fill="none" stroke={colors.dark} strokeWidth={1 + (i % 2)} opacity={0.55} />
      ))}
    </g>
  )
}

function TimberSwatch({ uid, colors, rand }: { uid: string; colors: MaterialColors; rand: () => number }) {
  /* Sawn boards are not all one width. Walk down the face laying planks of
     68–92 units until the swatch is covered, so the kerf lines fall in a
     different place on every board. */
  const planks: { y: number; h: number }[] = []
  for (let y = -14; y < H; ) {
    const h = 68 + Math.round(rand() * 24)
    planks.push({ y, h })
    y += h + 8
  }
  /* which end of the board the sawn end-grain shows on, and how big the log was */
  const endR = 38 + Math.round(rand() * 14)
  const endX = rand() < 0.5 ? 66 + Math.round(rand() * 20) : W - 70 - Math.round(rand() * 20)
  const endY = rand() < 0.45 ? 62 + Math.round(rand() * 18) : H - 62 - Math.round(rand() * 18)
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.light} />
          <stop offset="0.5" stopColor={colors.base} />
          <stop offset="1" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      {planks.map(({ y, h }, i) => (
        <g key={y}>
          <rect x={-6} y={y} width={W + 12} height={h} fill={`url(#${uid}-t)`} />
          <g filter="url(#dw-grain)" opacity={0.6}>
            {/* four figure lines per plank, spaced off the seed rather than on a
                fixed 16-unit grid — the fixed one made every board a barcode */}
            {[0, 1, 2, 3].map((j) => {
              const dy = Math.round(h * (0.14 + j * 0.21 + rand() * 0.06))
              return (
                <rect
                  key={j}
                  x={-10}
                  y={y + dy}
                  width={W + 20}
                  height={1.6 + ((i + j) % 3)}
                  fill={(i + j) % 2 ? colors.dark : colors.light}
                  opacity={0.4}
                />
              )
            })}
          </g>
          <rect x={-6} y={y + h} width={W + 12} height={8} fill={colors.dark} opacity={0.75} />
        </g>
      ))}
      <EndGrain cx={endX} cy={endY} r={endR} colors={colors} />
    </>
  )
}

function PlySwatch({ uid, colors, rand }: { uid: string; colors: MaterialColors; rand: () => number }) {
  /* how many sheets are on this pile, how thick each one is, and how far back
     the pile is stepped — thickness is what actually separates one grade from
     the next on the shop floor, so it is the axis that varies most */
  const count = 4 + Math.round(rand() * 2)
  const skew = 4 + Math.round(rand() * 6)
  const thickness = 26 + Math.round(rand() * 20)
  const sheets = Array.from({ length: count }, (_, i) => i)
  const pitch = (H - 74) / count
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-face`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor={colors.light} />
          <stop offset="0.6" stopColor={colors.base} />
          <stop offset="1" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      {/* stack of sheets, edge-on: alternating strata stripes */}
      {sheets.map((i) => {
        const y = 62 + i * pitch
        const inset = 24 + i * skew
        const width = W - inset * 2
        /* plies across this sheet's edge, spaced by its own thickness */
        const plies = Math.max(3, Math.round(thickness / 6))
        return (
          <g key={i}>
            <rect x={inset} y={y} width={width} height={thickness} fill={`url(#${uid}-face)`} />
            {/* core strata — kept low-contrast; at full strength the stack
                read as a graphic barcode rather than a sheet edge */}
            <g opacity={0.55}>
              {Array.from({ length: plies }, (_, j) => (
                <rect
                  key={j}
                  x={inset}
                  y={y + ((j + 1) * thickness) / (plies + 1)}
                  width={width}
                  height={2.6}
                  fill={j % 2 ? colors.dark : colors.light}
                  opacity={j % 2 ? 0.34 : 0.4}
                />
              ))}
            </g>
          </g>
        )
      })}
      {/* top face */}
      <g filter="url(#dw-grain)" opacity={0.5}>
        {[8, 22, 38].map((dy) => (
          <rect key={dy} x={24} y={30 + dy * 0.4} width={W - 48} height={1.6} fill={colors.dark} opacity={0.5} />
        ))}
      </g>
      <rect x={24} y={26} width={W - 48} height={36} rx={2} fill={colors.light} opacity={0.9} />
    </>
  )
}

function WpcSwatch({ uid, colors, rand }: { uid: string; colors: MaterialColors; rand: () => number }) {
  /* extrusion pitch — a thicker board has fewer, fatter cells */
  const cells = 9 + Math.round(rand() * 4)
  const pitch = (W - 96) / (cells - 1)
  const cellR = 4.6 + rand() * 1.8
  const rippleY = [76 + Math.round(rand() * 12), 114 + Math.round(rand() * 12), 150 + Math.round(rand() * 12)]
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-w`} x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={colors.light} />
          <stop offset="0.55" stopColor={colors.base} />
          <stop offset="1" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      <rect x={28} y={26} width={W - 56} height={H - 92} rx={10} fill={`url(#${uid}-w)`} />
      {/* extruded cell structure on the exposed edge */}
      <rect x={28} y={H - 58} width={W - 56} height={26} rx={6} fill={colors.dark} opacity={0.9} />
      {Array.from({ length: cells }, (_, i) => (
        <circle key={i} cx={48 + i * pitch} cy={H - 45} r={cellR} fill={colors.dark} opacity={0.6} />
      ))}
      {/* water-shrugging ripple lines — a whisper of surface texture; drawn
          bolder they turned the board into a cartoon */}
      <g stroke={colors.light} strokeWidth={1.4} fill="none" opacity={0.2}>
        {rippleY.map((y, i) => (
          <path
            key={y}
            d={`M48 ${y} q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`}
            opacity={[1, 0.6, 0.35][i]}
          />
        ))}
      </g>
    </>
  )
}

export function MaterialArt({
  material,
  base,
  dark,
  light,
  seed,
  className,
}: {
  material: 'timber' | 'ply' | 'wpc'
  base: string
  dark: string
  light: string
  /** Product id, so one board is one board everywhere it appears. */
  seed?: string
  className?: string
}) {
  const uid = useUid()
  const colors = { base, dark, light }
  /* Each swatch opens its own stream from the seed on every render, so the
     board is identical every time it is drawn — on the card, on the PDP it
     opens, and in the admin preview. A single shared generator would advance
     between renders and shuffle the grain under the cursor. */
  const key = seed ?? material
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      /* decorative: the product's name is right beside it, and `aria-hidden`
         would win over `role="img"` anyway */
      aria-hidden="true"
      focusable="false"
    >
      {material === 'timber' && <TimberSwatch uid={uid} colors={colors} rand={rng(key)} />}
      {material === 'ply' && <PlySwatch uid={uid} colors={colors} rand={rng(key)} />}
      {material === 'wpc' && <WpcSwatch uid={uid} colors={colors} rand={rng(key)} />}
    </svg>
  )
}
