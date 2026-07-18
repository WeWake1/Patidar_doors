import { DOOR_IMAGES } from '../data/images.gen'

/**
 * Dev-only curation aid (route /dev/gallery, DEV builds only): every processed
 * image with its id, so photoMap.ts assignments can be reviewed at a glance.
 */
export function DevGallery() {
  const entries = Object.entries(DOOR_IMAGES)
  return (
    <div className="page-pad">
      <h1 className="page-title">Image manifest ({entries.length})</h1>
      <div className="grid grid--3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {entries.map(([id, img]) => (
          <figure key={id} style={{ margin: 0 }}>
            <img src={img.src} alt={id} loading="lazy" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} />
            <figcaption style={{ font: '12px monospace' }}>
              {id} · {img.w}×{img.h}
              <br />
              {img.sourceFile}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
