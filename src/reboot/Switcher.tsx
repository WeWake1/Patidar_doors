// PROTOTYPE: the floating bar that flips between design variants (?variant=A|B|C|D, or the arrow keys).
// Not part of any design. The whole /reboot/ page is dev-only (reboot/index.html is not a build input).
import { useEffect } from 'react'

export interface VariantMeta {
  key: string
  name: string
}

export function Switcher({ round, variants, current, onPick }: {
  round: string
  variants: VariantMeta[]
  current: string
  onPick: (key: string) => void
}) {
  const i = Math.max(0, variants.findIndex((v) => v.key === current))
  const go = (d: number) => onPick(variants[(i + d + variants.length) % variants.length].key)

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
      <span className="proto-switcher__round">{round}</span>
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
