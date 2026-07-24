import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { ArtId, Tone, WorldId } from '../data/products'
import { WOOD_TONES } from '../data/products'
import { WORLDS } from '../data/worlds'
import { smoothScrollTo } from '../lib/smoothScroll'
import { easeInQuad, easeOutCubic, seg, useMediaQuery, useTrackProgress } from '../lib/useTrackProgress'
import { DoorArt } from './DoorArt'
import { HeroDoorPhoto } from './HeroDoorPhoto'
import { MaterialArt } from './MaterialArt'
import LightRays from './reactbits/LightRays'

/**
 * The portal hero: scroll swings the hero door open (phase A), pushes the
 * camera through the doorway (phase B), and lands in a corridor of four
 * world-doors (phase C/D). Transform + opacity only — nothing paint-heavy
 * animates during scroll. Falls back to a static layout under reduced motion.
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
 * Each world is a spinning glass globe with its material floating inside:
 * timber/ply/wpc use the generated MaterialArt swatch, doors a miniature
 * DoorArt leaf. `tone` also tints the globe's rim glow + label (via --wd).
 */
type Globe =
  | { id: WorldId; kind: 'door'; art: ArtId; tone: Tone }
  | { id: WorldId; kind: 'material'; material: 'timber' | 'ply' | 'wpc'; tone: Tone }

const WORLD_GLOBES: Globe[] = [
  { id: 'timbers', kind: 'material', material: 'timber', tone: t('w-timbers', 'Amber Teak', '#8a6234', '#6b4a24', '#a87c46') },
  { id: 'doors', kind: 'door', art: 'meridian', tone: WOOD_TONES[4] },
  { id: 'ply', kind: 'material', material: 'ply', tone: t('w-ply', 'Terracotta', '#b0725a', '#93583f', '#c78a70') },
  { id: 'wpc', kind: 'material', material: 'wpc', tone: t('w-wpc', 'Teal', '#2f7e72', '#215c53', '#47968a', false) },
]

function WorldGlobe({ globe, style, tabbable }: { globe: Globe; style?: React.CSSProperties; tabbable: boolean }) {
  const world = WORLDS.find((w) => w.id === globe.id)!
  return (
    <Link
      to={`/${globe.id}`}
      className={`world-globe world-globe--${globe.id}`}
      style={{ ...style, '--wd': globe.tone.base } as React.CSSProperties}
      tabIndex={tabbable ? 0 : -1}
    >
      <span className="globe" aria-hidden="true">
        <span className="globe__shine" />
        <span className={`globe__mat globe__mat--${globe.kind}`}>
          {globe.kind === 'door' ? (
            <DoorArt art={globe.art} tone={globe.tone} />
          ) : (
            <MaterialArt material={globe.material} base={globe.tone.base} dark={globe.tone.dark} light={globe.tone.light} />
          )}
        </span>
        <span className="globe__glass" />
      </span>
      <span className="world-globe__label">{world.short}</span>
      <span className="world-globe__hint">{world.tagline}</span>
    </Link>
  )
}

function Corridor({ p, interactive }: { p: number; interactive: boolean }) {
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
        {WORLD_GLOBES.map((g, i) => {
          const s = seg(p, 0.56 + i * 0.07, 0.66 + i * 0.07)
          return (
            <WorldGlobe
              key={g.id}
              globe={g}
              tabbable={interactive}
              style={{ opacity: s, transform: `translateY(${(1 - s) * 48}px)` }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function HeroPortal() {
  const trackRef = useRef<HTMLElement>(null)
  const p = useTrackProgress(trackRef)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const mobile = useMediaQuery('(max-width: 720px)')

  if (reduced) {
    return (
      <section className="portal portal--static">
        <div className="portal__stage portal__stage--static">
          <div className="portal__copy">
            <div className="hero__kicker">Our yard&nbsp;&nbsp;·&nbsp;&nbsp;Our factory&nbsp;&nbsp;·&nbsp;&nbsp;Our store</div>
            <h1 className="hero__title">
              Walk right <em>in</em>.
            </h1>
            <p className="hero__sub">
              Teak timbers, made-to-measure doors, ply and WPC — all under one roof. Step through and pick your world.
            </p>
          </div>
          <div className="portal__scene">
            <HeroDoorPhoto openDeg={38}>
              <div className="portal__glow" aria-hidden="true" />
            </HeroDoorPhoto>
          </div>
        </div>
        <div className="portal__grid">
          {WORLD_GLOBES.map((g) => (
            <WorldGlobe key={g.id} globe={g} tabbable />
          ))}
        </div>
      </section>
    )
  }

  const angle = easeOutCubic(seg(p, 0, 0.25)) * 95
  const copyOpacity = 1 - seg(p, 0.15, 0.25)
  const maxScale = mobile ? 8 : 13
  const scale = 1 + easeInQuad(seg(p, 0.25, 0.55)) * (maxScale - 1)
  const zoomOpacity = 1 - seg(p, 0.45, 0.55)
  const corridorInteractive = p > 0.7

  const peek = () => {
    const el = trackRef.current
    if (!el) return
    const top = el.offsetTop
    const total = el.offsetHeight - window.innerHeight
    const target = p < 0.15 ? top + total * 0.3 : p < 0.5 ? top + total : top
    smoothScrollTo(target)
  }

  return (
    <section className="portal portal--dark" ref={trackRef}>
      <div className="portal__sticky">
        {/* LightRays backdrop — only the opening phase; fades out before the corridor. */}
        <div
          className="portal__rays"
          style={{ opacity: zoomOpacity, visibility: zoomOpacity === 0 ? 'hidden' : 'visible' }}
          aria-hidden="true"
        >
          <LightRays
            raysOrigin="top-center"
            raysColor="#f2d18a"
            raysSpeed={0.9}
            lightSpread={0.7}
            rayLength={2}
            fadeDistance={1.2}
            followMouse
            mouseInfluence={0.08}
            noiseAmount={0.08}
            distortion={0.04}
          />
        </div>

        <Corridor p={p} interactive={corridorInteractive} />

        <div
          className="portal__zoom"
          style={{
            transform: `scale(${scale})`,
            opacity: zoomOpacity,
            visibility: zoomOpacity === 0 ? 'hidden' : 'visible',
            pointerEvents: p > 0.3 ? 'none' : 'auto',
          }}
        >
          <div className="portal__copy" style={{ opacity: copyOpacity }}>
            <div className="hero__kicker rise">Our yard&nbsp;&nbsp;·&nbsp;&nbsp;Our factory&nbsp;&nbsp;·&nbsp;&nbsp;Our store</div>
            <h1 className="hero__title rise rise--1">
              Walk right <em>in</em>.
            </h1>
            <p className="hero__sub rise rise--2">
              Teak timbers, made-to-measure doors, ply and WPC — all under one roof, straight from our factory floor.
            </p>
          </div>

          <div className="portal__scene rise rise--3">
            <HeroDoorPhoto openDeg={angle} onLeafClick={peek}>
              <div className="portal__glow" aria-hidden="true" />
            </HeroDoorPhoto>
          </div>
        </div>

        <button
          type="button"
          className="hero__scrollcue"
          style={{ opacity: copyOpacity, pointerEvents: copyOpacity > 0.3 ? 'auto' : 'none' }}
          onClick={peek}
          tabIndex={copyOpacity > 0.5 ? 0 : -1}
        >
          <span>Scroll — step inside</span>
          <span className="hero__arrow" aria-hidden="true">
            ↓
          </span>
        </button>
      </div>
    </section>
  )
}
