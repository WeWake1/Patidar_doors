/**
 * Getting the finished picture off the phone and into our WhatsApp.
 *
 * This is the exit the whole feature exists for. A live AR session ends with
 * nothing in anyone's hands; a composed JPEG goes straight into the share
 * sheet, where WhatsApp is the first target on essentially every phone this
 * store sees.
 *
 * ⚠️ Compose **before** arming the button, never inside the tap handler. iOS
 * treats a long `await` chain as having consumed the user activation, and
 * `navigator.share()` then rejects with NotAllowedError. The UI therefore
 * builds the blob on "Looks right" and the share handler does almost nothing.
 */

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Whether this browser can share a *file* (not merely a URL). In-app webviews
 * routinely expose `navigator.share` while refusing files, so the probe has to
 * ask about a real File.
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
  try {
    const probe = new File([new Uint8Array(1)], 'probe.jpg', { type: 'image/jpeg' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

export async function shareImage(blob: Blob, filename: string, text: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch (e) {
      /* A cancelled share sheet is a decision, not a fault — showing an error
         for it is worse than showing nothing. Everything else (a webview that
         claimed it could share, a lost activation) falls through to the save,
         so the customer still ends up holding the picture. */
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }

  download(blob, filename)
  return 'downloaded'
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  // Revoking in the same task can race the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
