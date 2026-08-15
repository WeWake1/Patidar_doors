import { useEffect } from 'react'

const BASE_TITLE = 'Patidar Doors — Timber, doors, ply & WPC'

/** Sets document title + meta description for the current page. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Patidar Doors` : BASE_TITLE

    const el = document.querySelector('meta[name="description"]')
    // The title was restored on unmount and the description was not, so it
    // outlived the page that set it: leaving a route that has one for a route
    // that doesn't left the old page's description sitting in the document.
    const previous = el?.getAttribute('content') ?? null
    if (description && el) el.setAttribute('content', description)

    return () => {
      document.title = BASE_TITLE
      if (description && el && previous !== null) el.setAttribute('content', previous)
    }
  }, [title, description])
}
