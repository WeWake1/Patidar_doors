/**
 * The viewfinder: a live rear-camera preview with the door guides drawn on it.
 *
 * The guides are the entire reason this exists. `rectifyAspect` turns the
 * outline into inches, and how square-on the shot was is what decides whether
 * that number is good to 1% or 6% — so the moment to ask for a square shot is
 * while the customer is still standing in front of the door, not in a hint
 * above a file picker they have already used.
 *
 * ⚠️ It hands back a `LoadedPhoto`, the same object `loadPhoto` produces, so
 * the route treats a camera shot and an uploaded file identically. There is one
 * photo pipeline; this is a second door into it.
 */

import { useEffect, useRef, useState } from 'react'
import { CameraError, grabFrame, openCamera, stopCamera, type CameraErrorCode } from '../../lib/cameraCapture'
import type { LoadedPhoto } from '../../lib/photoLoad'
import { t } from '../../lib/i18n'

export interface CameraShotProps {
  onShot(photo: LoadedPhoto): void
  onCancel(): void
  /** Reported so the picker can show the reason where the button was. */
  onFail(code: CameraErrorCode): void
}

export function CameraShot({ onShot, onCancel, onFail }: CameraShotProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    openCamera().then(
      (stream) => {
        /* Unmounted while the permission sheet was up — a very normal race on a
           phone, and the one that leaves the lens lit if it is not handled. */
        if (cancelled) {
          stopCamera(stream)
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        /* Autoplay can still reject (a backgrounded tab, a locked screen); the
           shutter stays disabled until a frame actually arrives, so a failure
           here shows the spinner rather than a dead black rectangle. */
        void v.play().catch(() => {})
      },
      (e) => {
        if (cancelled) return
        onFail(e instanceof CameraError ? e.code : 'unsupported')
      },
    )
    return () => {
      cancelled = true
      stopCamera(streamRef.current)
      streamRef.current = null
    }
  }, [onFail])

  const shoot = async () => {
    const v = videoRef.current
    if (!v || busy) return
    setBusy(true)
    try {
      onShot(await grabFrame(v))
    } catch {
      onFail('unsupported')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label={t('try.cam.title')}>
      <video
        ref={videoRef}
        className="cam__feed"
        /* ⚠️ All three are load-bearing on iOS: without `playsInline` Safari
           hands the stream to the native fullscreen player, which takes the
           guides and the shutter off screen with it. `muted` is what lets
           autoplay run at all. */
        playsInline
        muted
        autoPlay
        onLoadedMetadata={() => setLive(true)}
      />

      {/* The guides. Two uprights and a floor line — the customer fits their
          door between them, which is the same thing `try.pick.hint` asks for in
          words but said where it can actually be acted on. */}
      <div className="cam__guides" aria-hidden="true">
        <span className="cam__upright cam__upright--l" />
        <span className="cam__upright cam__upright--r" />
        <span className="cam__floor" />
      </div>

      <p className="cam__hint">{live ? t('try.cam.guide') : t('try.cam.starting')}</p>

      <div className="cam__bar">
        <button type="button" className="cam__cancel" onClick={onCancel}>
          {t('try.cam.cancel')}
        </button>
        <button
          type="button"
          className="cam__shutter"
          onClick={shoot}
          disabled={!live || busy}
          aria-label={t('try.cam.shoot')}
        />
        {/* Balances the shutter into the centre without a second control. */}
        <span className="cam__spacer" aria-hidden="true" />
      </div>
    </div>
  )
}
