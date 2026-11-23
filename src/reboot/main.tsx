// PROTOTYPE · creative reboot, round 1 (2026-11-23). Four hero concepts on one dev-only page:
// /reboot/?variant=A|B|C|D (arrow keys and the bottom bar switch). Nothing here is imported by the live site
// (src/main.tsx), and reboot/index.html is not a build input. Write-up: docs/prototypes/README.md.
import { StrictMode, useCallback, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import './reboot.css'
import { Switcher, type VariantMeta } from './Switcher'
import { Weight } from './r1/a/Weight'
import { Stack } from './r1/b/Stack'
import { Cut } from './r1/c/Cut'
import { Grain } from './r1/d/Grain'

const VARIANTS: (VariantMeta & { View: () => ReactElement })[] = [
  { key: 'A', name: 'The weight', View: Weight },
  { key: 'B', name: 'Four materials, one roof', View: Stack },
  { key: 'C', name: 'The first cut', View: Cut },
  { key: 'D', name: 'Into the grain', View: Grain },
]

const fromUrl = () => {
  const k = (new URLSearchParams(window.location.search).get('variant') ?? 'A').toUpperCase()
  return VARIANTS.some((v) => v.key === k) ? k : 'A'
}

function Reboot() {
  const [key, setKey] = useState(fromUrl)
  const pick = useCallback((k: string) => {
    const u = new URL(window.location.href)
    u.searchParams.set('variant', k)
    window.history.replaceState(null, '', u)
    document.documentElement.dataset.variant = k
    window.scrollTo(0, 0)
    setKey(k)
  }, [])
  const v = VARIANTS.find((x) => x.key === key) ?? VARIANTS[0]
  useEffect(() => {
    document.title = `${v.name} · Patidar Doors (prototype)`
  }, [v])
  return (
    <>
      <v.View key={v.key} />
      <Switcher round="Round 1" variants={VARIANTS} current={key} onPick={pick} />
    </>
  )
}

const el = document.getElementById('root')
if (el) {
  createRoot(el).render(
    <StrictMode>
      <Reboot />
    </StrictMode>,
  )
}
