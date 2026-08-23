import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { ArtId, Tone, WorldId } from '../data/products'
import { WOOD_TONES } from '../data/products'
import { WORLDS } from '../data/worlds'
import { seg } from '../lib/useTrackProgress'
import { DoorArt } from './DoorArt'
import { MaterialArt } from './MaterialArt'

/**
 * The pieces both heroes share: the four world cards, the corridor they stand
 * in, and the kicker above the headline.
 *
 * Extracted from HeroPortal 2026-08-21 when the keyhole/tunnel hero was
 * prototyped beside it. Nothing here changed in the move — the corridor is
 * still driven by the same 0.45→0.9 slice of progress it always was, so a hero
 * whose own phases run on a different schedule remaps its `p` on the way in
 * rather than editing these thresholds (see HeroKeyhole).
 */

const t = (id: string, name: string, base: string, dark: string, light: string, grain = true): Tone => ({
  id,
  name,
  base,
  dark,
  light,
  grain,
  delta: 0,
})

/**
 * Each world is one card showing its material full-bleed: timber/ply/wpc use
 * the generated MaterialArt swatch, doors a DoorArt leaf. `tone` tints the
 * card's frame accent + rule (via --wd).
 */
export type WorldArt =
  | { id: WorldId; kind: 'door'; art: ArtId; tone: Tone }
  | { id: WorldId; kind: 'material'; material: 'timber' | 'ply' | 'wpc'; tone: Tone }

/* Material colours are the real thing, not the world's brand accent (which
   stays on the frame/rule): teak amber, a golden-teak leaf, pale birch ply,
   and a muted slate-green WPC — a saturated teal board read as a toy. */
export const WORLD_ARTS: WorldArt[] = [
  { id: 'timbers', kind: 'material', material: 'timber', tone: t('w-timbers', 'Amber Teak', '#8a6234', '#63431f', '#ab8149') },
  { id: 'doors', kind: 'door', art: 'classic', tone: WOOD_TONES[1] },
  { id: 'ply', kind: 'material', material: 'ply', tone: t('w-ply', 'Birch Ply', '#c3a279', '#8c6c45', '#e0c8a4') },
  { id: 'wpc', kind: 'material', material: 'wpc', tone: t('w-wpc', 'Slate Green', '#5d7b76', '#3d5854', '#8ba5a1', false) },
]

/**
 * The card's contents, split out and memoised because they never change while
 * the card itself is scroll-scrubbed.
 *
 * The corridor re-renders on every frame of the reveal — that is the whole
 * point of it — but the only thing that actually differs frame to frame is the
 * opacity/transform on the Link. Behind that sit ~180 static SVG nodes across
 * the four cards: three feTurbulence-displaced material swatches and a drawn
 * door leaf. React was reconciling all of them sixty times a second to apply a
 * transform on their grandparent, and that reconciliation was most of the
 * hero's main-thread budget (measured: 395ms of scripting across a 2.1s scroll,
 * a third of the main thread, on a 4x-throttled phone).
 *
 * `art` is one of the module-level WORLD_ARTS constants, so this renders once
 * and then never again.
 */
const WorldCardInner = memo(function WorldCardInner({ art }: { art: WorldArt }) {
  const world = WORLDS.find((w) => w.id === art.id)!
  return (
    <>
      <span className={`wcard__art wcard__art--${art.kind}`} aria-hidden="true">
        {art.kind === 'door' ? (
          <DoorArt art={art.art} tone={art.tone} />
        ) : (
          <MaterialArt
            material={art.material}
            base={art.tone.base}
            dark={art.tone.dark}
            light={art.tone.light}
            seed={`world-${art.id}`}
          />
        )}
        <span className="wcard__scrim" />
        <span className="wcard__frame" />
      </span>
      <span className="wcard__body">
        <span className="wcard__name">{world.short}</span>
        <span className="wcard__tag">{world.tagline}</span>
      </span>
    </>
  )
})

export function WorldCard({ art, style, tabbable }: { art: WorldArt; style?: React.CSSProperties; tabbable: boolean }) {
  return (
    <Link
      to={`/${art.id}`}
      className={`wcard wcard--${art.id}`}
      style={{ ...style, '--wd': art.tone.base } as React.CSSProperties}
      tabIndex={tabbable ? 0 : -1}
    >
      <WorldCardInner art={art} />
    </Link>
  )
}

/**
 * "Our yard · Our factory · Our store" — each phrase is atomic so a narrow
 * screen breaks between them, never mid-phrase ("OUR YARD · OUR / FACTORY…").
 *
 * Memoised for the same reason as WorldCardInner: it sits inside a scrubbed
 * block whose opacity is rewritten every frame.
 */
export const HeroKicker = memo(function HeroKicker({ className }: { className?: string }) {
  return (
    <div className={`hero__kicker${className ? ` ${className}` : ''}`}>
      {['Our yard', 'Our factory', 'Our store'].map((phrase, i, all) => (
        <span key={phrase} className="hero__kicker-part">
          {phrase}
          {/* separator trails its phrase, so a wrap never starts a line with "·" */}
          {i < all.length - 1 && (
            <span className="hero__kicker-sep" aria-hidden="true">
              ·
            </span>
          )}
        </span>
      ))}
    </div>
  )
})

/**
 * The four worlds as an ordinary page band rather than the hero's last phase.
 *
 * Added 2026-08-23, when the keyhole hero's payoff became the Door Wall: you
 * fly through the doors and arrive at the doors, which is the thing the whole
 * animation has been promising. The worlds still have to be reachable from the
 * home page though — three of the four are not doors at all, and nothing in a
 * wall of doors leads anyone to plywood — so they take the slot the wall
 * vacated, further down the page.
 *
 * ⚠️ This is NOT the `.worldstrip` that was deleted on 2026-08-13. That one was
 * removed for duplicating the hero corridor's "Choose your world" ~600px below
 * an unskippable copy of itself. With the corridor gone from the hero, this is
 * the only place on the page the four worlds are offered, so it is the thing
 * the strip was a second copy of, not a third.
 */
export function WorldsBand() {
  return (
    <section className="worldsband">
      <div className="worldsband__head">
        <div className="kicker kicker--gold">Four ways in</div>
        <h2>Choose your world</h2>
      </div>
      <div className="portal__doors worldsband__doors">
        {WORLD_ARTS.map((g) => (
          <WorldCard key={g.id} art={g} tabbable />
        ))}
      </div>
    </section>
  )
}

export function Corridor({ p, interactive }: { p: number; interactive: boolean }) {
  const heading = seg(p, 0.8, 0.88)
  return (
    <div
      className="portal__corridor"
      style={{
        opacity: seg(p, 0.45, 0.58),
        visibility: p > 0.45 ? 'visible' : 'hidden',
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <div className="portal__hall" aria-hidden="true" />
      <div className="portal__corridor-head" style={{ opacity: heading, transform: `translateY(${(1 - heading) * 14}px)` }}>
        <div className="kicker kicker--gold">Step into the store</div>
        <h2>Choose your world</h2>
      </div>
      <div className="portal__doors">
        {WORLD_ARTS.map((g, i) => {
          const s = seg(p, 0.56 + i * 0.07, 0.66 + i * 0.07)
          return (
            <WorldCard
              key={g.id}
              art={g}
              tabbable={interactive}
              style={{ opacity: s, transform: `translateY(${(1 - s) * 48}px)` }}
            />
          )
        })}
      </div>
    </div>
  )
}
