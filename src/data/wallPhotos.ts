/**
 * The Door Wall — the drifting photo wall at the top of /shop (see
 * `components/DoorWall.tsx`).
 *
 * ⚠️ PLACEHOLDERS. These 28 ids are borrowed from the existing catalogue
 * photography in `images.gen.ts` so the wall has something real to show; they
 * are *not* a curated set and several are duplicated elsewhere on the site.
 *
 * To swap in the client's own shots:
 *   1. drop the raw files into `Main Doors/` or `Room Doors/`
 *   2. `npm run images:build`  → new `main-NN` / `room-NN` ids in images.gen.ts
 *   3. replace the ids below (24–30 works best; below ~15 the loop repeats
 *      visibly, above ~36 the tiles stop paying for their download)
 *   4. fill in `caption` where a photo deserves a name — blank means the
 *      viewer shows no caption, which is the safe default while copy is
 *      unconfirmed.
 *
 * Portrait shots (2:3 – 3:4) sit best: the tiles are portrait and the viewer
 * frames the whole leaf. These 28 were eyeballed at full size for third-party
 * watermarks — the wall shows photos far larger than a card does, so the marks
 * photoMap.ts only had to avoid on covers show up here too. Anything carrying a
 * logo, url strip, screenshot chrome or social badge is deliberately absent.
 */
import { DOOR_IMAGES } from './images.gen'

const WALL_IDS = [
  'main-01', 'main-03', 'main-04', 'main-05', 'main-07', 'main-08', 'main-09',
  'main-11', 'main-13', 'main-16', 'main-23', 'main-25', 'main-26', 'main-31',
  'main-33', 'main-34', 'main-38', 'main-41', 'main-43', 'main-49',
  'room-10', 'room-13', 'room-23', 'room-24', 'room-25', 'room-30', 'room-44',
  'room-50',
]

/** Per-id caption shown under the big viewer. Empty = no caption. */
const CAPTIONS: Record<string, string> = {}

export interface WallPhoto {
  id: string
  /** 480w webp — what the drifting tiles load */
  thumb: string
  thumbSrcSet?: string
  /** 960w webp — what the big viewer loads */
  full: string
  w: number
  h: number
  alt: string
  caption?: string
}

/** widest candidate in a generated srcSet, i.e. the 960w file */
function widest(srcSet: string | undefined, fallback: string): string {
  if (!srcSet) return fallback
  const last = srcSet.split(',').pop()!.trim()
  return last.split(/\s+/)[0] || fallback
}

export const WALL_PHOTOS: WallPhoto[] = WALL_IDS.flatMap((id, i) => {
  const img = DOOR_IMAGES[id]
  if (!img) return []
  const caption = CAPTIONS[id]
  return [
    {
      id,
      thumb: img.src,
      thumbSrcSet: img.srcSet,
      full: widest(img.srcSet, img.src),
      w: img.w,
      h: img.h,
      alt: caption || `Door ${i + 1} from the Patidar Doors showroom`,
      caption,
    },
  ]
})
