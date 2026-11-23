// PROTOTYPE: the floating bar that flips between design variants (?variant=A..H, or the arrow keys). The arrows
// stay within a round; the round label goes to the next round. Not part of any design. The whole /reboot/ page is
// dev-only (reboot/index.html is not a build input).
import { useEffect } from 'react'

export interface VariantMeta {
  key: string
  name: string
}
export interface RoundMeta {
  label: string
  variants: VariantMeta[]
}

export function Switcher({ rounds, current, onPick }: {
  rounds: RoundMeta[]
  current: string
  onPick: (key: string) => void
}) {
  const ri = Math.max(0, rounds.findIndex((r) => r.variants.some((v) => v.key === current)))
  const variants = rounds[ri].variants
  const i = Math.max(0, variants.findIndex((v) => v.key === current))
  const go = (d: number) => onPick(variants[(i + d + variants.length) % variants.length].key)
  const nextRound = rounds[(ri + 1) % rounds.length]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowRight') onPick(variants[(i + 1) % variants.length].key)
      if (e.key === 'ArrowLeft') onPick(variants[(i - 1 + variants.length) % variants.length].key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, variants, onPick])

  return (
    <div className="proto-switcher" role="toolbar" aria-label="Design variant switcher (prototype)">
      <button
        type="button"
        className="proto-switcher__round"
        onClick={() => onPick(nextRound.variants[0].key)}
        aria-label={`${rounds[ri].label}. Switch to ${nextRound.label}`}
        title={`Switch to ${nextRound.label}`}
      >
        {rounds[ri].label}
      </button>
      <button type="button" onClick={() => go(-1)} aria-label="Previous variant">
        ←
      </button>
      <span className="proto-switcher__label">
        {variants[i].key} · {variants[i].name}
      </span>
      <button type="button" onClick={() => go(1)} aria-label="Next variant">
        →
      </button>
    </div>
  )
}
