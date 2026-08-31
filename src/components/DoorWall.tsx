import { Suspense, lazy, memo, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import DriftWall from './reactbits/DriftWall'
import type { DriftWallItem } from './reactbits/DriftWall'
import { ErrorBoundary } from './ErrorBoundary'
import { WALL_PHOTOS } from '../data/wallPhotos'
import { t } from '../lib/i18n'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useScrollLock } from '../lib/useScrollLock'

// gsap ships with StrokeText and nothing else on the site needs it — keep it
// out of the entry bundle. The fallback holds the same box so the band doesn't
// jump when the chunk lands.
const StrokeText = lazy(() => import('./reactbits/StrokeText'))

const TITLE = 'THE DOOR WALL'

/**
 * The wall's photos are placeholders awaiting the client's own photography, so
 * a dead reference here is likelier than anywhere else on the site — and these
 * two are the largest images the site ever shows. Their `<img>` is `width:auto`
 * inside a flex frame, so a failed one collapses to nothing rather than holding
 * its place; hence a real fallback rather than the CSS cover the small tiles
 * use.
 */
function WallPhoto({ photo }: { photo: { id: string; full: string; alt: string; w: number; h: number } }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className="doorwall__missing" role="img" aria-label={t('photo.unavailableFor', { alt: photo.alt })}>
        {t('photo.unavailable')}
      </div>
    )
  }
  return (
    <img
      key={photo.id}
      src={photo.full}
      alt={photo.alt}
      width={photo.w}
      height={photo.h}
      onError={() => setFailed(true)}
    />
  )
}

/** wide enough for the two-up split: wall on the right, chosen door on the left */
const SPLIT_QUERY = '(min-width: 900px)'

const ITEMS: DriftWallItem[] = WALL_PHOTOS.map((p) => ({
  image: p.thumb,
  srcSet: p.thumbSrcSet,
  sizes: '(min-width: 900px) 200px, 140px',
  title: p.alt,
}))

/**
 * Home-page showpiece: a slow 3D wall of door photographs drifting past.
 *
 * On a wide screen it is a two-up — the wall lives on the right and the door
 * you click blows up on the left. Narrow screens keep the wall exactly as it
 * is (it is the nicest thing on the page at that width) and a tap opens the
 * photo full-screen instead, because a viewer pinned above or below the wall
 * would update off-screen.
 *
 * Lived on /shop until 2026-08-13. Nothing here knows where it is mounted, but
 * two things assume it is not on the catalogue any more: the closing link goes
 * to /shop, and it must be mounted through `DoorWallSlot` rather than imported
 * directly — the reasons are in that file.
 *
 * ⚠️ **`memo`, and it is load-bearing inside the keyhero hero.** `HeroKeyhole`
 * re-renders on every scroll frame — that is what a scrubbed hero is — and this
 * subtree is 56 tiles and 28 `<img>`s, so unmemoised React re-rendered and
 * diffed the whole wall 60×/sec. It did it from the very top of the page, too,
 * because the wall mounts on the first idle callback after `load` and long
 * before it is visible: measured on a throttled phone profile, that was ~115ms
 * of script per 2.5s scrub — about half of ALL script time in the hero —
 * whether or not anything of the wall was on screen. Memoising took the hero's
 * script cost from 243ms to ~130ms over the same scrub.
 * The three props are already shaped for it: `compact` is a constant, `paused`
 * a boolean, and `headOpacity` is quantised to 1/50 by the hero (see the note
 * at its call site there) — so this re-renders ~50 times across the whole
 * track instead of ~300. ⚠️ Anything added to the prop list has to be
 * quantised or referentially stable the same way, or the memo silently stops
 * being one.
 */
export const DoorWall = memo(function DoorWall({
  compact = false,
  paused = false,
  headOpacity,
}: { compact?: boolean; paused?: boolean; headOpacity?: number } = {}) {
  const split = useMediaQuery(SPLIT_QUERY)
  const [chosen, setChosen] = useState(0)
  const [zoomed, setZoomed] = useState<number | null>(null)

  useScrollLock(zoomed !== null)

  /* ── the drawn headline inside the sticky pane ───────────────────────────
     StrokeText's own ScrollTrigger cannot fire this one. Inside a 100dvh
     sticky pane the title sits mid-viewport from the top of the track, so
     `start: 'top 82%'` is already satisfied the moment the trigger is created
     and the draw plays minutes of scroll before the wall is on screen — which
     is why the compact variant carried a plain <h2> from 2026-08-23 until
     2026-08-31. The hero already knows when the head arrives, because it fades
     it in itself, so the draw is latched off `headOpacity` instead and the
     component is mounted at that moment for `trigger="mount"` to play it.
     ⚠️ Latched, never a bare `headOpacity > 0`: scrubbing back up and down
     again must not redraw a headline the visitor has already watched. */
  const [drawTitle, setDrawTitle] = useState(false)
  useEffect(() => {
    if (headOpacity !== undefined && headOpacity > 0) setDrawTitle(true)
  }, [headOpacity])

  /* ⚠️ Mounting on the reveal frame would start the ~46 kB gsap fetch on that
     frame too, and the headline would arrive plain and then snap to outline
     part-way through its own fade-in. The chunk is pulled as soon as the wall
     mounts — p > 0.24, or at idle with the page at rest — and merely not
     played. */
  useEffect(() => {
    if (compact) void import('./reactbits/StrokeText')
  }, [compact])

  const closeRef = useRef<HTMLButtonElement>(null)
  /** The tile that opened the overlay, so closing puts the caret back on it. */
  const openerRef = useRef<HTMLElement | null>(null)

  const closeZoom = useCallback(() => setZoomed(null), [])

  useEffect(() => {
    if (zoomed === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeZoom()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed, closeZoom])

  /**
   * The overlay declares `aria-modal`, so focus has to actually be inside it —
   * it was left on the tile behind, which meant a keyboard visitor opened the
   * photo and then tabbed through the whole page underneath it, and a screen
   * reader announced nothing. The tiles are real buttons (DriftWall gives them
   * `tabIndex=0` + `role="button"`), so there is a genuine element to come back
   * to on close. Same shape as `Nav`'s burger restore and `CartDrawer`'s
   * focus-the-close-button.
   */
  useEffect(() => {
    if (zoomed === null) return
    openerRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      openerRef.current?.focus?.()
      openerRef.current = null
    }
  }, [zoomed])

  // the split view disappearing under a resize would leave a stale overlay
  useEffect(() => {
    if (split) setZoomed(null)
  }, [split])

  const onSelect = useCallback(
    (_item: DriftWallItem, index: number) => {
      if (split) setChosen(index)
      else setZoomed(index)
    },
    [split],
  )

  const photo = WALL_PHOTOS[chosen]
  const zoom = zoomed === null ? undefined : WALL_PHOTOS[zoomed]
  if (!photo) return null

  return (
    <section className={`doorwall${compact ? ' doorwall--compact' : ''}`} aria-labelledby="doorwall-title">
      {/* ⚠️ `headOpacity` is applied HERE, on the head itself, and must never
          go back to being a custom property set on an ancestor. A changing
          custom property invalidates style for every element that inherits it,
          and when the hero drove one on the wall's wrapper it was invalidating
          the whole wall — 28 tiles, the viewer, the overlay — on every frame of
          the scrub. That single declaration was 130 ms of style recalc across
          one pass of the hero, five times everything else it does put
          together. */}
      <div className="doorwall__head" style={headOpacity === undefined ? undefined : { opacity: headOpacity }}>
        <div className="kicker kicker--gold">Straight off the shop floor</div>
        {/* ⚠️ The compact variant drives the draw itself rather than leaving it
            to StrokeText's ScrollTrigger — see `drawTitle` above for why the
            trigger cannot work inside the sticky pane. It is `trigger="mount"`
            + a mount held back to the head's own reveal, so the same headline
            plays on arrival instead of at the top of the track. */}
        <h2 className="doorwall__title" id="doorwall-title">
          {/* The `-webkit-text-stroke` span holds the same box and the same
              words, so a gsap chunk that fails to load (redeploy under an open
              tab) costs the animation and nothing else — it must never cost the
              headline, or the section loses its title. It is also what stands
              in the compact variant's box until the hero reveals the head. */}
          <ErrorBoundary label="stroke-text" fallback={<span className="doorwall__title-fb">{TITLE}</span>}>
          <Suspense fallback={<span className="doorwall__title-fb">{TITLE}</span>}>
            {compact && !drawTitle ? (
              <span className="doorwall__title-fb">{TITLE}</span>
            ) : (
            <StrokeText
              text={TITLE}
              trigger={compact ? 'mount' : 'scroll'}
              fillMode="fade"
              /* brand gold on cream, not the reactbits violet/slate */
              strokeColor="#c9a964"
              fillColor="#f5f0e6"
              strokeWidth={1.6}
              drawDuration={1.7}
              fillDelay={0.3}
              stagger={0.04}
              ease="sine.inOut"
              fontSize={128}
              fontWeight={800}
              letterSpacing={-4}
              reverse={false}
            />
            )}
          </Suspense>
          </ErrorBoundary>
        </h2>
        <p className="doorwall__sub">
          {split
            ? 'Every one of these is standing in the store. Click any door on the wall to bring it forward.'
            : 'Every one of these is standing in the store. Tap any door to see it up close.'}
        </p>
        {/* Deliberately no "see the catalogue" link here, though the band is a
            teaser now: `.featured` sits directly below it and closes with
            exactly that link — on a 900px screen both are visible at once, and
            the pair read as a stutter. The hand-off is the next section's. */}
      </div>

      <div className="doorwall__split">
        {split && (
          <figure className="doorwall__viewer">
            <div className="doorwall__frame">
              {/* keyed on the photo so each pick re-runs the fade-in — and so
                  a failed photo's state doesn't carry to the next pick */}
              <WallPhoto key={photo.id} photo={photo} />
            </div>
            {photo.caption && <figcaption className="doorwall__cap">{photo.caption}</figcaption>}
          </figure>
        )}

        <div className="doorwall__wall">
          <DriftWall
            items={ITEMS}
            columns={3}
            tileWidth={split ? 196 : 132}
            tileHeight={split ? 268 : 182}
            gap={split ? 18 : 12}
            radius={split ? 10 : 8}
            tilt={split ? 11 : 9}
            turn={split ? -15 : -9}
            depth={split ? 110 : 70}
            perspective={split ? 1150 : 900}
            speed={split ? 34 : 28}
            variance={0.4}
            parallax={split ? 0.6 : 0}
            lift={split ? 92 : 52}
            fade={0.58}
            /* the dim/overlay pair is the "unhovered" state — on a phone
               nothing is ever hovered, so the wall would just look muddy */
            dim={split ? 0.72 : 0.94}
            overlayColor="#1c1610"
            selectedIndex={split ? chosen : (zoomed ?? -1)}
            onSelect={onSelect}
            paused={paused}
            ariaLabel={t('doorwall.label')}
            style={{ '--dw-ring': 'rgba(201, 169, 100, 0.95)' } as CSSProperties}
          />
        </div>
      </div>

      {zoom && (
        <div className="doorzoom" role="dialog" aria-modal="true" aria-label={zoom.caption || zoom.alt}>
          {/* The scrim is the tap-outside-to-close affordance, and it duplicates
              the visible Close button below. Announced, it was a second,
              unlabelled-on-screen "Close photo" immediately before the real one;
              keyboard and screen-reader users close with that button or Escape. */}
          <button
            type="button"
            className="doorzoom__back"
            onClick={closeZoom}
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="doorzoom__box">
            <WallPhoto key={zoom.id} photo={zoom} />
            {zoom.caption && <div className="doorzoom__cap">{zoom.caption}</div>}
          </div>
          <button ref={closeRef} type="button" className="doorzoom__close" onClick={closeZoom}>
            Close
          </button>
        </div>
      )}
    </section>
  )
})
