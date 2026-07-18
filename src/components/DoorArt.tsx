/**
 * Original SVG door artwork — 12 catalog designs + the hero 'classic'.
 *
 * Every leaf is drawn in a 300 × 800 viewBox (≈ 3′ × 8′) and tinted by a
 * `Tone` (wood / paint / steel). Wood realism comes from striped overlays
 * warped by a shared feTurbulence displacement filter (see <DoorArtDefs/>,
 * mounted once in App).
 */
import { useMemo, type ReactNode } from 'react'
import type { ArtId, Tone } from '../data/products'

export const LEAF_W = 300
export const LEAF_H = 800

const BRASS = { hi: '#EDD49B', mid: '#C9A964', lo: '#8F6F3C' }
const STEEL = { hi: '#DCDEE3', mid: '#A8ACB4', lo: '#6E727B' }
const BLACK = { hi: '#3A3A3E', mid: '#232326', lo: '#121214' }

let uidCounter = 0

/** Shared filters/gradients referenced by every door. Mount once, app-wide. */
export function DoorArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
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

/** The Kyoto — japandi vertical slats, black edge pull. */
function Kyoto({ uid, tone }: { uid: string; tone: Tone }) {
  const slatW = 24
  const slats = Array.from({ length: 12 }, (_, i) => i * (slatW + 1))
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-slat`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={tone.dark} />
          <stop offset="0.35" stopColor={tone.light} />
          <stop offset="0.8" stopColor={tone.base} />
          <stop offset="1" stopColor={tone.dark} />
        </linearGradient>
      </defs>
      <rect width={LEAF_W} height={LEAF_H} fill={tone.dark} />
      {slats.map((x, i) => (
        <rect key={x} x={x} y="0" width={slatW} height={LEAF_H} fill={`url(#${uid}-slat)`} opacity={i % 3 === 1 ? 0.92 : 1} />
      ))}
      <GrainStripes tone={tone} seed={9} opacity={0.32} />
      {/* full-height matte black edge pull */}
      <rect x="288" y="0" width="12" height={LEAF_H} fill={BLACK.mid} />
      <rect x="288" y="0" width="2.5" height={LEAF_H} fill="#000" opacity="0.5" />
      <rect x="291" y="330" width="6" height="140" rx="3" fill={BLACK.hi} />
      <EdgeShade />
    </>
  )
}

/** The Meridian — ebonised leaf, one full-height brass inlay. */
function Meridian({ uid, tone }: { uid: string; tone: Tone }) {
  return (
    <>
      <WoodBase uid={uid} tone={tone} seed={7} />
      <defs>
        <linearGradient id={`${uid}-inlay`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={BRASS.hi} />
          <stop offset="0.45" stopColor={BRASS.mid} />
          <stop offset="0.75" stopColor={BRASS.lo} />
          <stop offset="1" stopColor={BRASS.mid} />
        </linearGradient>
      </defs>
      {/* soft glow either side of the inlay */}
      <rect x="196" y="0" width="22" height={LEAF_H} fill="#000" opacity="0.25" />
      <rect x="203" y="0" width="7" height={LEAF_H} fill={`url(#${uid}-inlay)`} />
      <rect x="203" y="0" width="2" height={LEAF_H} fill="#fff" opacity="0.35" />
      <BarPull uid={uid} x={266} y={330} h={140} w={6} />
      <EdgeShade />
    </>
  )
}

/** The Jaali — diamond lattice band over frosted glass, brass rim. */
function Jaali({ uid, tone }: { uid: string; tone: Tone }) {
  const fx = 72, fy = 130, fw = 156, fh = 540
  const lines: ReactNode[] = []
  for (let k = -fh; k < fw + fh; k += 39) {
    lines.push(<line key={`a${k}`} x1={fx + k} y1={fy} x2={fx + k + fh} y2={fy + fh} />)
    lines.push(<line key={`b${k}`} x1={fx + k + fh} y1={fy} x2={fx + k} y2={fy + fh} />)
  }
  return (
    <>
      <WoodBase uid={uid} tone={tone} seed={11} />
      <defs>
        <clipPath id={`${uid}-jclip`}>
          <rect x={fx} y={fy} width={fw} height={fh} />
        </clipPath>
        <linearGradient id={`${uid}-frost`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F4EFE3" />
          <stop offset="0.5" stopColor="#EAE2CF" />
          <stop offset="1" stopColor="#DFD5BE" />
        </linearGradient>
      </defs>
      {/* recessed rim */}
      <rect x={fx - 12} y={fy - 12} width={fw + 24} height={fh + 24} fill={tone.dark} />
      <rect x={fx - 6} y={fy - 6} width={fw + 12} height={fh + 12} fill="none" stroke={BRASS.mid} strokeWidth="2.5" />
      {/* frosted glass */}
      <rect x={fx} y={fy} width={fw} height={fh} fill={`url(#${uid}-frost)`} />
      {/* lattice */}
      <g clipPath={`url(#${uid}-jclip)`}>
        <g stroke={tone.dark} strokeWidth="11">{lines}</g>
        <g stroke={tone.light} strokeWidth="2" opacity="0.5">{lines}</g>
      </g>
      <rect x={fx} y={fy} width={fw} height={fh} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
      <circle cx="262" cy="400" r="11" fill={BRASS.mid} stroke={BRASS.lo} strokeWidth="2" />
      <circle cx="259" cy="397" r="3.5" fill={BRASS.hi} />
      <EdgeShade />
    </>
  )
}

/** The Deco — sunburst fan marquetry with brass rays. */
function Deco({ uid, tone }: { uid: string; tone: Tone }) {
  const cx = 150, cy = 810, R = 900
  const rays: ReactNode[] = []
  const seams: ReactNode[] = []
  const n = 11
  for (let i = 0; i < n; i++) {
    const a0 = -90 - 62 + (124 / n) * i
    const a1 = a0 + 124 / n
    const x0 = cx + R * Math.cos((a0 * Math.PI) / 180)
    const y0 = cy + R * Math.sin((a0 * Math.PI) / 180)
    const x1 = cx + R * Math.cos((a1 * Math.PI) / 180)
    const y1 = cy + R * Math.sin((a1 * Math.PI) / 180)
    rays.push(
      <path
        key={i}
        d={`M${cx},${cy} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`}
        fill={i % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)'}
      />,
    )
    if (i > 0) seams.push(<line key={i} x1={cx} y1={cy} x2={x0} y2={y0} stroke={BRASS.mid} strokeWidth="2.2" opacity="0.9" />)
  }
  return (
    <>
      <WoodBase uid={uid} tone={tone} seed={13} />
      <g>{rays}</g>
      <GrainStripes tone={tone} seed={14} opacity={0.22} />
      <g>{seams}</g>
      {/* demi-lune plinth of the fan */}
      <circle cx={cx} cy={cy} r="98" fill={tone.dark} />
      <circle cx={cx} cy={cy} r="98" fill="none" stroke={BRASS.mid} strokeWidth="3" />
      <circle cx={cx} cy={cy} r="72" fill="none" stroke={BRASS.mid} strokeWidth="2" opacity="0.8" />
      <circle cx={cx} cy={cy} r="48" fill="none" stroke={BRASS.hi} strokeWidth="1.5" opacity="0.7" />
      {/* round brass pull */}
      <circle cx="252" cy="410" r="15" fill="none" stroke={BRASS.mid} strokeWidth="5" />
      <circle cx="252" cy="410" r="15" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" transform="translate(1.5,2)" />
      <EdgeShade />
    </>
  )
}

/** The Haveli — carved heritage borders, studs, ring pull, aged surface. */
function Haveli({ uid, tone }: { uid: string; tone: Tone }) {
  const studXs = [58, 104, 150, 196, 242]
  const diamonds: ReactNode[] = []
  for (let y = 210; y <= 590; y += 76) {
    for (let x = 88; x <= 212; x += 62) {
      diamonds.push(
        <path
          key={`${x}-${y}`}
          d={`M${x},${y - 22} L${x + 22},${y} L${x},${y + 22} L${x - 22},${y} Z`}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="2.5"
        />,
      )
      diamonds.push(
        <path
          key={`${x}-${y}h`}
          d={`M${x},${y - 22} L${x + 22},${y} L${x},${y + 22} L${x - 22},${y} Z`}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
          transform="translate(1,1.5)"
        />,
      )
    }
  }
  const aged = { hi: '#C8A560', mid: '#9A7B45', lo: '#6B5430' }
  return (
    <>
      <WoodBase uid={uid} tone={tone} seed={17} />
      <rect width={LEAF_W} height={LEAF_H} fill={tone.dark} filter="url(#dw-mottle)" opacity="0.22" />
      {/* twin carved borders */}
      <rect x="16" y="16" width="268" height="768" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="9" />
      <rect x="16" y="16" width="268" height="768" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" />
      <rect x="40" y="40" width="220" height="720" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="5" />
      <rect x="43" y="43" width="214" height="714" fill="none" stroke={aged.mid} strokeWidth="1.5" opacity="0.8" />
      {/* corner medallions */}
      {(
        [
          [40, 40],
          [260, 40],
          [40, 760],
          [260, 760],
        ] as const
      ).map(([x, y]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="14" fill={tone.dark} stroke={aged.mid} strokeWidth="2.5" />
          <circle cx={x} cy={y} r="5" fill={aged.mid} />
        </g>
      ))}
      {/* carved diamond field */}
      <g>{diamonds}</g>
      {/* stud rows */}
      {[92, 708].map((y) =>
        studXs.map((x) => (
          <g key={`${x}${y}`}>
            <circle cx={x + 1} cy={y + 2} r="8" fill="rgba(0,0,0,0.4)" />
            <circle cx={x} cy={y} r="8" fill={aged.mid} />
            <circle cx={x - 2.5} cy={y - 2.5} r="2.6" fill={aged.hi} />
          </g>
        )),
      )}
      {/* ring pull */}
      <circle cx="236" cy="404" r="9" fill={aged.mid} stroke={aged.lo} strokeWidth="2" />
      <circle cx="236" cy="424" r="17" fill="none" stroke={aged.mid} strokeWidth="6" />
      <circle cx="236" cy="426" r="17" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      <EdgeShade />
    </>
  )
}

/** The Chevron — two-tone herringbone laminate. */
function Chevron({ uid, tone }: { uid: string; tone: Tone }) {
  const rowH = 72
  return (
    <>
      <defs>
        <pattern id={`${uid}-chev`} width={LEAF_W} height={rowH * 2} patternUnits="userSpaceOnUse">
          <rect width={LEAF_W} height={rowH * 2} fill={tone.base} />
          <path d={`M0,${rowH} L150,8 L300,${rowH} L300,${rowH * 2} L150,${rowH + 8} L0,${rowH * 2} Z`} fill={tone.dark} />
          <path d={`M0,${rowH} L150,8 L300,${rowH}`} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
          <path d={`M0,${rowH * 2} L150,${rowH + 8} L300,${rowH * 2}`} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
        </pattern>
        <linearGradient id={`${uid}-cs`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.15" stopColor="#000" stopOpacity="0" />
          <stop offset="0.85" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-chev)`} />
      <GrainStripes tone={tone} seed={19} opacity={0.18} />
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-cs)`} />
      <BarPull uid={uid} x={270} y={334} h={132} w={5.5} metal={BLACK} />
      <EdgeShade />
    </>
  )
}

/** The Linea — trios of routed horizontal grooves. */
function Linea({ uid, tone }: { uid: string; tone: Tone }) {
  const groups = [128, 262, 396, 530, 664]
  return (
    <>
      <WoodBase uid={uid} tone={tone} seed={23} />
      {groups.map((gy) => (
        <g key={gy}>
          {[0, 16, 32].map((dy) => (
            <g key={dy}>
              <rect x="0" y={gy + dy} width={LEAF_W} height="3.4" fill="rgba(0,0,0,0.42)" />
              <rect x="0" y={gy + dy + 3.4} width={LEAF_W} height="1.4" fill="rgba(255,255,255,0.15)" />
            </g>
          ))}
        </g>
      ))}
      <circle cx="260" cy="410" r="11" fill={BRASS.mid} stroke={BRASS.lo} strokeWidth="2" />
      <circle cx="256.5" cy="406.5" r="3.5" fill={BRASS.hi} />
      <EdgeShade />
    </>
  )
}

/** The Duet — ivory × wood split with a steel seam. */
function Duet({ uid, tone }: { uid: string; tone: Tone }) {
  const ivory: Tone = { id: 'ivory', name: 'Ivory', base: '#EDE5D4', dark: '#DCD1B9', light: '#F6F0E2', grain: false, delta: 0 }
  return (
    <>
      <defs>
        <clipPath id={`${uid}-right`}>
          <rect x="150" y="0" width="150" height={LEAF_H} />
        </clipPath>
        <linearGradient id={`${uid}-ivory`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ivory.light} />
          <stop offset="1" stopColor={ivory.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-seam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={STEEL.lo} />
          <stop offset="0.5" stopColor={STEEL.hi} />
          <stop offset="1" stopColor={STEEL.lo} />
        </linearGradient>
      </defs>
      {/* left: ivory */}
      <rect width="150" height={LEAF_H} fill={`url(#${uid}-ivory)`} />
      <rect width="150" height={LEAF_H} fill="#000" opacity="0.03" />
      {/* right: wood */}
      <g clipPath={`url(#${uid}-right)`}>
        <WoodBase uid={`${uid}r`} tone={tone} seed={29} />
      </g>
      {/* steel seam */}
      <rect x="146" y="0" width="8" height={LEAF_H} fill={`url(#${uid}-seam)`} />
      <rect x="146" y="0" width="1.5" height={LEAF_H} fill="#000" opacity="0.3" />
      <BarPull uid={uid} x={160} y={330} h={140} w={5.5} metal={STEEL} />
      <EdgeShade />
    </>
  )
}

/** The Flute — continuous half-round fluting in matte colour. */
function Flute({ uid, tone }: { uid: string; tone: Tone }) {
  const pitch = 25
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-fl`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={tone.dark} />
          <stop offset="0.3" stopColor={tone.light} />
          <stop offset="0.62" stopColor={tone.base} />
          <stop offset="1" stopColor={tone.dark} />
        </linearGradient>
        <pattern id={`${uid}-flutes`} width={pitch} height="10" patternUnits="userSpaceOnUse">
          <rect width={pitch} height="10" fill={`url(#${uid}-fl)`} />
        </pattern>
        <linearGradient id={`${uid}-soft`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width={LEAF_W} height={LEAF_H} fill={tone.base} />
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-flutes)`} />
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-soft)`} />
      <BarPull uid={uid} x={269} y={336} h={128} w={5.5} metal={BLACK} />
      <EdgeShade />
    </>
  )
}

/** The Atrium — ribbed-glass half-lite in a black grid, wood below. */
function Atrium({ uid, tone }: { uid: string; tone: Tone }) {
  const gx = 42, gy = 62, gw = 216, gh = 384
  const ribs: ReactNode[] = []
  for (let x = gx; x < gx + gw; x += 9) {
    ribs.push(<rect key={x} x={x} y={gy} width="4.5" height={gh} fill="#fff" opacity={x % 18 === 0 ? 0.34 : 0.16} />)
  }
  return (
    <>
      <WoodBase uid={uid} tone={tone} seed={31} />
      <defs>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#E7EBE4" />
          <stop offset="0.5" stopColor="#CDD5CE" />
          <stop offset="1" stopColor="#B9C2BE" />
        </linearGradient>
      </defs>
      {/* glass */}
      <rect x={gx} y={gy} width={gw} height={gh} fill={`url(#${uid}-glass)`} />
      <g>{ribs}</g>
      <polygon points={`${gx},${gy + gh} ${gx + gw * 0.55},${gy} ${gx + gw},${gy} ${gx + gw * 0.45},${gy + gh}`} fill="#fff" opacity="0.10" />
      {/* black grid: 2 cols × 3 rows */}
      <g fill={BLACK.mid}>
        <rect x={gx - 10} y={gy - 10} width={gw + 20} height="10" />
        <rect x={gx - 10} y={gy + gh} width={gw + 20} height="10" />
        <rect x={gx - 10} y={gy - 10} width="10" height={gh + 20} />
        <rect x={gx + gw} y={gy - 10} width="10" height={gh + 20} />
        <rect x={gx + gw / 2 - 3} y={gy} width="6" height={gh} />
        <rect x={gx} y={gy + gh / 3 - 3} width={gw} height="6" />
        <rect x={gx} y={gy + (gh * 2) / 3 - 3} width={gw} height="6" />
      </g>
      <rect x={gx - 10} y={gy - 10} width={gw + 20} height={gh + 20} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      {/* groove trio on the lower leaf */}
      {[540, 556, 572].map((y) => (
        <g key={y}>
          <rect x="0" y={y} width={LEAF_W} height="3" fill="rgba(0,0,0,0.4)" />
          <rect x="0" y={y + 3} width={LEAF_W} height="1.2" fill="rgba(255,255,255,0.14)" />
        </g>
      ))}
      <BarPull uid={uid} x={268} y={470} h={120} w={5.5} metal={BLACK} />
      <EdgeShade />
    </>
  )
}

/** The Noir — ultra-matte black, one long brass pull. */
function Noir({ uid, tone }: { uid: string; tone: Tone }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-noir`} cx="0.35" cy="0.22" r="1.2">
          <stop offset="0" stopColor={tone.light} />
          <stop offset="0.55" stopColor={tone.base} />
          <stop offset="1" stopColor={tone.dark} />
        </radialGradient>
      </defs>
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-noir)`} />
      {/* micro-texture */}
      <rect width={LEAF_W} height={LEAF_H} fill={tone.light} filter="url(#dw-brush)" opacity="0.16" />
      <BarPull uid={uid} x={54} y={220} h={360} w={8} />
      <EdgeShade />
    </>
  )
}

/** The Sentinel — brushed steel, armour seams, smart-lock plate. */
function Sentinel({ uid, tone }: { uid: string; tone: Tone }) {
  const seams = [76, 150, 224]
  const rivets: number[] = []
  for (let y = 70; y <= 730; y += 82) rivets.push(y)
  return (
    <>
      <defs>
        <linearGradient id={`${uid}-steelbase`} x1="0" y1="0" x2="1" y2="0.25">
          <stop offset="0" stopColor={tone.dark} />
          <stop offset="0.35" stopColor={tone.light} />
          <stop offset="0.7" stopColor={tone.base} />
          <stop offset="1" stopColor={tone.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-plate`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E2E33" />
          <stop offset="1" stopColor="#1C1C20" />
        </linearGradient>
      </defs>
      <rect width={LEAF_W} height={LEAF_H} fill={`url(#${uid}-steelbase)`} />
      <rect width={LEAF_W} height={LEAF_H} fill="#fff" filter="url(#dw-brush)" opacity="0.35" />
      {/* armour seams + rivets */}
      {seams.map((x) => (
        <g key={x}>
          <rect x={x} y="0" width="2.4" height={LEAF_H} fill="rgba(0,0,0,0.5)" />
          <rect x={x + 2.4} y="0" width="1.2" height={LEAF_H} fill="rgba(255,255,255,0.18)" />
          {rivets.map((y) => (
            <g key={y}>
              <circle cx={x + 14} cy={y} r="3.6" fill={STEEL.mid} />
              <circle cx={x + 13} cy={y - 1} r="1.4" fill={STEEL.hi} />
            </g>
          ))}
        </g>
      ))}
      {/* smart-lock plate */}
      <rect x="230" y="342" width="52" height="132" rx="8" fill={`url(#${uid}-plate)`} stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
      <rect x="238" y="352" width="36" height="18" rx="3" fill="#0E3B33" opacity="0.9" />
      <rect x="238" y="352" width="36" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => (
        <circle
          key={i}
          cx={244 + (i % 3) * 12}
          cy={386 + Math.floor(i / 3) * 14}
          r="3"
          fill={BRASS.mid}
          opacity="0.9"
        />
      ))}
      <rect x="238" y="446" width="36" height="6" rx="3" fill={BRASS.lo} />
      {/* handle */}
      <BarPull uid={uid} x={200} y={356} h={104} w={9} metal={STEEL} />
      <EdgeShade />
    </>
  )
}

const DESIGNS: Record<ArtId, (p: { uid: string; tone: Tone }) => ReactNode> = {
  classic: (p) => <Classic {...p} />,
  kyoto: (p) => <Kyoto {...p} />,
  meridian: (p) => <Meridian {...p} />,
  jaali: (p) => <Jaali {...p} />,
  deco: (p) => <Deco {...p} />,
  haveli: (p) => <Haveli {...p} />,
  chevron: (p) => <Chevron {...p} />,
  linea: (p) => <Linea {...p} />,
  duet: (p) => <Duet {...p} />,
  flute: (p) => <Flute {...p} />,
  atrium: (p) => <Atrium {...p} />,
  noir: (p) => <Noir {...p} />,
  sentinel: (p) => <Sentinel {...p} />,
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
