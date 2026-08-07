import { useEffect, useState } from 'react'

/**
 * Reactive `matchMedia`. Only for the handful of places where a breakpoint has
 * to change *behaviour*, not just styling — CSS media queries stay the default
 * for anything purely visual.
 *
 * Starts `false` on the first render so the server/first paint never assumes a
 * wide viewport, then settles in an effect.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}
