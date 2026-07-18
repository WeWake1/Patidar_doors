import { useEffect } from 'react'

const BASE_TITLE = 'Doorswala — Premium doors, factory direct'

/** Sets document title + meta description for the current page. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Doorswala` : BASE_TITLE
    if (description) {
      const el = document.querySelector('meta[name="description"]')
      if (el) el.setAttribute('content', description)
    }
    return () => {
      document.title = BASE_TITLE
    }
  }, [title, description])
}
