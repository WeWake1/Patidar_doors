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

function TimberSwatch({ uid, colors }: { uid: string; colors: MaterialColors }) {
  const plankYs = [0, 78, 156, 234]
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors.light} />
          <stop offset="0.5" stopColor={colors.base} />
          <stop offset="1" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      {plankYs.map((y, i) => (
        <g key={y}>
          <rect x={-6} y={y} width={W + 12} height={70} fill={`url(#${uid}-t)`} />
          <g filter="url(#dw-grain)" opacity={0.6}>
            {[14, 30, 46, 58].map((dy, j) => (
              <rect
                key={dy}
                x={-10}
                y={y + dy}
                width={W + 20}
                height={1.6 + ((i + j) % 3)}
                fill={(i + j) % 2 ? colors.dark : colors.light}
                opacity={0.4}
              />
            ))}
          </g>
          <rect x={-6} y={y + 70} width={W + 12} height={8} fill={colors.dark} opacity={0.75} />
        </g>
      ))}
      <EndGrain cx={330} cy={236} r={44} colors={colors} />
    </>
  )
}

function PlySwatch({ uid, colors }: { uid: string; colors: MaterialColors }) {
  const sheets = [0, 1, 2, 3, 4]
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
        const y = 62 + i * 46
        return (
          <g key={i}>
            <rect x={24 + i * 6} y={y} width={W - 48 - i * 12} height={40} fill={`url(#${uid}-face)`} />
            <g opacity={0.85}>
              {[6, 12, 18, 24, 30].map((dy, j) => (
                <rect
                  key={dy}
                  x={24 + i * 6}
                  y={y + dy}
                  width={W - 48 - i * 12}
                  height={3}
                  fill={j % 2 ? colors.dark : colors.light}
                  opacity={j % 2 ? 0.5 : 0.7}
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

function WpcSwatch({ uid, colors }: { uid: string; colors: MaterialColors }) {
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
      {Array.from({ length: 11 }, (_, i) => (
        <circle key={i} cx={52 + i * 30} cy={H - 45} r={7} fill={colors.light} opacity={0.85} />
      ))}
      {/* water-shrugging ripple lines */}
      <g stroke={colors.light} strokeWidth={2} fill="none" opacity={0.55}>
        <path d="M48 80 q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" />
        <path d="M48 116 q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" opacity={0.6} />
        <path d="M48 152 q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0" opacity={0.35} />
      </g>
    </>
  )
}

export function MaterialArt({
  material,
  base,
  dark,
  light,
  className,
}: {
  material: 'timber' | 'ply' | 'wpc'
  base: string
  dark: string
  light: string
  className?: string
}) {
  const uid = useUid()
  const colors = { base, dark, light }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {material === 'timber' && <TimberSwatch uid={uid} colors={colors} />}
      {material === 'ply' && <PlySwatch uid={uid} colors={colors} />}
      {material === 'wpc' && <WpcSwatch uid={uid} colors={colors} />}
    </svg>
  )
}
