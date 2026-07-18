import { useEffect } from 'react'

const BASE_TITLE = 'Patidar Doors — Timber, doors, ply & WPC'

/** Sets document title + meta description for the current page. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Patidar Doors` : BASE_TITLE
    if (description) {
      const el = document.querySelector('meta[name="description"]')
      if (el) el.setAttribute('content', description)
    }
    return () => {
      document.title = BASE_TITLE
    }
  }, [title, description])
}
