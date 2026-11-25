// PROTOTYPE · creative reboot. Every round of hero concepts on one dev-only page, each round kept exactly as it
// was judged: /reboot/?variant=A|B|C|D is round 1 (23 Nov 2026), E|F|G|H round 2, I|J|K|L round 3, M|N|O|P round 4. The letters never repeat across
// rounds, so a link to an earlier round still opens what it opened then. The arrow keys and the bottom bar move
// within a round; the round label switches rounds. Nothing here is imported by the live site (src/main.tsx), and
// reboot/index.html is not a build input. Write-up: docs/prototypes/README.md.
import { StrictMode, useCallback, useEffect, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import './reboot.css'
import { Switcher, type RoundMeta } from './Switcher'
import { Weight } from './r1/a/Weight'
import { Stack } from './r1/b/Stack'
import { Cut } from './r1/c/Cut'
import { Grain } from './r1/d/Grain'
import { Knock } from './r2/e/Knock'
import { Actual } from './r2/f/Actual'
import { NextDoor } from './r2/g/NextDoor'
import { YourName } from './r2/h/YourName'
import { Arrival } from './r3/i/Arrival'
import { Pavilion } from './r3/j/Pavilion'
import { ObjectHero } from './r3/k/ObjectHero'
import { OneRoom } from './r3/l/OneRoom'
import { ArrivalII, GoldenHour, Hall, Nightfall } from './r4/Films'

type Variant = { key: string; name: string; View: () => ReactElement }
const ROUNDS: (RoundMeta & { variants: Variant[] })[] = [
  {
    label: 'Round 1',
    variants: [
      { key: 'A', name: 'The weight', View: Weight },
      { key: 'B', name: 'Four materials, one roof', View: Stack },
      { key: 'C', name: 'The first cut', View: Cut },
      { key: 'D', name: 'Into the grain', View: Grain },
    ],
  },
  {
    label: 'Round 2',
    variants: [
      { key: 'E', name: 'Knock', View: Knock },
      { key: 'F', name: 'Actual size', View: Actual },
      { key: 'G', name: 'Next door', View: NextDoor },
      { key: 'H', name: 'Your name here', View: YourName },
    ],
  },
  {
    label: 'Round 3',
    variants: [
      { key: 'I', name: 'Arrival', View: Arrival },
      { key: 'J', name: 'Pavilion (live 3D)', View: Pavilion },
      { key: 'K', name: 'Object (live 3D)', View: ObjectHero },
      { key: 'L', name: 'One room', View: OneRoom },
    ],
  },
  {
    label: 'Round 4',
    variants: [
      { key: 'M', name: 'Arrival II', View: ArrivalII },
      { key: 'N', name: 'Nightfall', View: Nightfall },
      { key: 'O', name: 'The hall', View: Hall },
      { key: 'P', name: 'Late light', View: GoldenHour },
    ],
  },
]
const ALL = ROUNDS.flatMap((r) => r.variants)
const LATEST = ROUNDS[ROUNDS.length - 1].variants[0].key

const fromUrl = () => {
  const q = new URLSearchParams(window.location.search)
  const k = (q.get('variant') ?? '').toUpperCase()
  if (ALL.some((v) => v.key === k)) return k
  const r = Number(q.get('round'))
  return ROUNDS[r - 1]?.variants[0].key ?? LATEST
}

function Reboot() {
  const [key, setKey] = useState(fromUrl)
  const pick = useCallback((k: string) => {
    const u = new URL(window.location.href)
    u.searchParams.set('variant', k)
    u.searchParams.delete('round')
    window.history.replaceState(null, '', u)
    document.documentElement.dataset.variant = k
    window.scrollTo(0, 0)
    setKey(k)
  }, [])
  const v = ALL.find((x) => x.key === key) ?? ALL[0]
  useEffect(() => {
    document.title = `${v.name} · Patidar Doors (prototype)`
  }, [v])
  return (
    <>
      <v.View key={v.key} />
      <Switcher rounds={ROUNDS} current={key} onPick={pick} />
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
