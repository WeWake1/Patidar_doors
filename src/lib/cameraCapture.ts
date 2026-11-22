/**
 * The live camera behind "Take a photo" on `/try/:id`.
 *
 * This is not a second way to get a photo — it is a better way to get a *good*
 * one. `rectifyAspect` recovers the door's true proportions from the outline,
 * and its accuracy is dominated by how square-on the shot was; today we ask for
 * that in words (`try.pick.hint`) and find out whether it happened afterwards.
 * A viewfinder can draw the guides on the room itself, while the customer is
 * still standing there and can take a step back.
 *
 * ⚠️ It replaces the `capture="environment"` file input **only where it works**,
 * and never the photo-library button. Half of all visitors are trying a door
 * they photographed yesterday, and the counter staff work from photos customers
 * sent them on WhatsApp — see the note on FileButton in TryAtHome.tsx.
 *
 * Unlike the AR path this works everywhere `getUserMedia` does, iPhones very
 * much included: it is a `<video>` element and a canvas, not WebXR.
 */

import { PhotoError, photoFromSource, type LoadedPhoto } from './photoLoad'

export type CameraErrorCode =
  /** The visitor said no, or the browser has a standing block for this origin. */
  | 'denied'
  /** No camera on the device at all. */
  | 'none'
  /** There is one, but something else holds it — common on Android. */
  | 'busy'
  /** `getUserMedia` is absent, which on a phone means an insecure origin. */
  | 'unsupported'

export class CameraError extends Error {
  code: CameraErrorCode
  constructor(code: CameraErrorCode) {
    super(code)
    this.name = 'CameraError'
    this.code = code
  }
}

/**
 * Can this browser open a camera at all?
 *
 * Cheap, synchronous and deliberately **not** a permission check — asking for
 * permission is what the shutter tap is for. `navigator.mediaDevices` is
 * undefined on an insecure origin, so this covers http:// as well as old
 * browsers. `localhost` is a secure context, so `npm run dev` behaves like
 * production.
 */
export function cameraAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

/**
 * The rear camera, at the highest resolution the device will volunteer.
 *
 * ⚠️ `facingMode` is `ideal`, not `exact`. As `exact` it throws
 * OverconstrainedError on any device whose back camera is not labelled the way
 * the constraint expects — laptops, some tablets, a few Androids — and the
 * customer gets a failure where a front camera would have been a usable
 * fallback. Preference, not requirement.
 */
export async function openCamera(): Promise<MediaStream> {
  if (!cameraAvailable()) throw new CameraError('unsupported')
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1920 },
      },
      audio: false,
    })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new CameraError('denied')
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new CameraError('none')
    if (name === 'NotReadableError' || name === 'AbortError') throw new CameraError('busy')
    throw new CameraError('unsupported')
  }
}

/**
 * Stop every track. Idempotent, and safe on a stream that already ended.
 *
 * ⚠️ Not optional housekeeping: while a track is live the camera indicator
 * stays lit and on most Androids no other app can open the lens. Leaving one
 * running because the component unmounted is the kind of bug people uninstall
 * over — so this is called from an effect cleanup, not from the shutter.
 */
export function stopCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop())
}

/**
 * Freeze the current frame into the same `LoadedPhoto` the file picker makes.
 *
 * From here the two paths are indistinguishable — the quad guess, the ambient
 * sample, the rectifier and the compositor all take it as it comes.
 *
 * ⚠️ Reads `videoWidth`/`videoHeight`, never `width`/`height`: those are the
 * CSS box, so a full-bleed preview would capture the *viewport's* aspect and
 * silently letterbox the customer's doorway.
 */
export async function grabFrame(video: HTMLVideoElement): Promise<LoadedPhoto> {
  const nw = video.videoWidth
  const nh = video.videoHeight
  // Zero means the stream has not produced a frame yet — the shutter is
  // disabled until it has, so this is the belt-and-braces half.
  if (!nw || !nh) throw new PhotoError('decode')
  return photoFromSource(video, nw, nh)
}
