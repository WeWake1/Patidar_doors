/**
 * "Place it in the room" — the WebXR half of /try/:id.
 *
 * ⚠️ **This component is the lazy boundary, and it must stay mounted from the
 * moment AR is known to be supported.** `requestSession('immersive-ar')`
 * consumes transient user activation, so a dynamic import inside the tap
 * handler would spend the activation on the download and Chrome would reject
 * the session — the same failure recorded for `navigator.share()` in
 * shareImage.ts. Mounting early means `arScene` is already parsed when the
 * thumb lands, and the handler can call straight into it.
 *
 * Everything expensive after that point is fine to await: the session is up,
 * the reticle is already hunting for a surface, and the texture arrives during
 * a phase the customer is spending anyway.
 *
 * The scope rule is in arSupport.ts: this renders nothing at all on a device
 * without ARCore-backed WebXR, which includes every iPhone. The photo flow is
 * not a fallback for this — it is the feature, and it is complete alone.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeafSource } from './DoorLayer'
import { DoorArt } from '../DoorArt'
import { ArError, startArSession, type ArErrorCode, type ArHandle } from '../../lib/arScene'
import { t } from '../../lib/i18n'

/**
 * The leaf is rasterised once, at a size chosen for a screen a metre away
 * rather than for print. Larger buys nothing — the texture is magnified by
 * distance far more than by resolution — and the grain filter is expensive.
 */
const TEX_H = 1024

type Phase = 'idle' | 'starting' | 'hunting' | 'ready' | 'placed'

export interface ArPlacementProps {
  source: LeafSource
  heightIn: number
  widthIn: number
  /** Shown burnt into the overlay so a screenshot is not anonymous. */
  label: string
}

export function ArPlacement({ source, heightIn, widthIn, label }: ArPlacementProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [err, setErr] = useState<ArErrorCode | null>(null)

  const overlayRef = useRef<HTMLDivElement>(null)
  const artRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<ArHandle | null>(null)

  /* The hidden <DoorArt> only exists while a session is being set up. It is
     ~180 SVG nodes with a turbulence filter on it, and rendering that into the
     pick step on every Android that merely *could* do AR would be a cost paid
     by everyone for something most will not tap. */
  const live = phase !== 'idle'

  // End the session if the route unmounts under it — Back during AR is normal.
  useEffect(() => () => handleRef.current?.end(), [])

  /**
   * The texture, prepared *after* the session is up.
   *
   * Drawn doors are serialised from the live SVG the same way the exporter does
   * it, so the leaf standing in the room carries the same gradient ids and the
   * same grain as the one on the product page. Photographed doors are already
   * the leaf, edge to edge, because the admin cropper cut them that way.
   */
  const paint = useCallback(
    async (handle: ArHandle) => {
      const { rasterizeDoor, loadLeafPhoto, pickLargest } = await import('../../lib/doorRaster')
      if (source.kind === 'art') {
        const svg = artRef.current?.querySelector<SVGSVGElement>('svg')
        if (!svg) throw new ArError('gl')
        const w = Math.round(TEX_H * (widthIn / heightIn))
        handle.setTexture(await rasterizeDoor(svg, w, TEX_H))
      } else {
        const src = source.photo.srcSet ? pickLargest(source.photo.srcSet) : source.photo.src
        handle.setTexture(await loadLeafPhoto(src))
      }
    },
    [source, heightIn, widthIn],
  )

  const start = useCallback(() => {
    const overlay = overlayRef.current
    if (!overlay || phase !== 'idle') return
    setErr(null)
    setPhase('starting')

    /* ⚠️ No await before this call — see the file header. `startArSession`
       reaches `requestSession` synchronously, which is what preserves the
       activation the tap granted. */
    startArSession({
      heightIn,
      widthIn,
      overlay,
      onTracking: (found) => setPhase((p) => (p === 'placed' ? p : found ? 'ready' : 'hunting')),
      onPlaced: (placed) => setPhase(placed ? 'placed' : 'hunting'),
      onEnd: () => {
        handleRef.current = null
        setPhase('idle')
      },
    }).then(
      (handle) => {
        handleRef.current = handle
        setPhase('hunting')
        /* A texture that never arrives leaves a session showing a reticle and
           nothing else, which reads as a hang. Close it and say so. */
        paint(handle).catch(() => {
          setErr('gl')
          handle.end()
        })
      },
      (e) => {
        setErr(e instanceof ArError ? e.code : 'unavailable')
        setPhase('idle')
      },
    )
  }, [phase, heightIn, widthIn, paint])

  return (
    <>
      <button type="button" className="btn btn--ghost btn--big arx__open" onClick={start} disabled={phase === 'starting'}>
        {t('try.ar.open')}
      </button>
      {err && (
        <p className="try__err" role="alert">
          {t(`try.ar.err.${err}`)}
        </p>
      )}

      {/* Rasterisation source. Off-screen rather than display:none — a node
          that is not rendered has no layout, and Safari has historically
          serialised such an SVG at a default 300×150. */}
      {live && source.kind === 'art' && (
        <div className="arx__art" ref={artRef} aria-hidden="true">
          <DoorArt art={source.art} tone={source.tone} />
        </div>
      )}

      {/* The DOM overlay root. Chrome renders it above the camera feed for the
          life of the session, and it must already be in the document when
          requestSession runs — so it is always mounted, and merely empty when
          idle. */}
      <div className="arx__overlay" ref={overlayRef} data-live={live ? '' : undefined}>
        {live && (
          <>
            <p className="arx__hint">
              {phase === 'placed' ? t('try.ar.placedHint') : phase === 'ready' ? t('try.ar.tap') : t('try.ar.hunting')}
            </p>
            <div className="arx__bar">
              <span className="arx__label">{label}</span>
              <div className="arx__acts">
                {phase === 'placed' && (
                  <button type="button" className="arx__btn" onClick={() => handleRef.current?.moveAgain()}>
                    {t('try.ar.move')}
                  </button>
                )}
                <button type="button" className="arx__btn arx__btn--end" onClick={() => handleRef.current?.end()}>
                  {t('try.ar.exit')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
