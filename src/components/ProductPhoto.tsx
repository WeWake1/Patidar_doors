import { useState } from 'react'
import type { ProductImage } from '../data/products'
import { t } from '../lib/i18n'

/**
 * Every catalogue `<img>` on the storefront goes through here.
 *
 * Photos are CMS-owned: their URLs live in a build-time snapshot
 * (`catalog.gen.ts`) while the files themselves live in a Supabase bucket the
 * client can empty. Delete a photo in `/admin` and the site keeps pointing at
 * it until the next publish — and the browser's answer to that is its own
 * broken-image glyph, a grey box with a torn page in it, sitting inside a door
 * frame on a page about how good the doors look.
 *
 * The replacement is a drawn panel in the system's own materials, so a missing
 * photo reads as a door that hasn't been photographed rather than as a site
 * that is broken. It keeps the leaf's 3:8 box, so nothing around it moves.
 */
export function ProductPhoto({
  photo,
  className,
  sizes = '(max-width: 720px) 90vw, 30vw',
  loading = 'lazy',
}: {
  photo: ProductImage
  className?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`photo-missing${className ? ' ' + className : ''}`}
        role="img"
        /* The state, then the subject. Taking `photo.alt` alone told a screen
           reader the door was on screen while everyone else saw an empty
           panel. */
        aria-label={t('photo.unavailableFor', { alt: photo.alt })}
      >
        <span className="photo-missing__grain" aria-hidden="true" />
        <span className="photo-missing__label">{t('photo.unavailable')}</span>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={photo.src}
      srcSet={photo.srcSet}
      sizes={sizes}
      alt={photo.alt}
      width={photo.w}
      height={photo.h}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
