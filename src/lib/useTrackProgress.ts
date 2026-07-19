import { useEffect, useState, type RefObject } from 'react'

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/** 0→1 within [a,b] of overall progress p, clamped. */
export function seg(p: number, a: number, b: number): number {
  return clamp01((p - a) / (b - a))
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeInQuad(t: number): number {
  return t * t
}

/**
 * Scroll progress (0..1) through a tall "track" element with a sticky stage
 * inside — 0 when the track top hits the viewport top, 1 when its bottom
 * reaches the viewport bottom. rAF-throttled; the ref must be reset to 0 in
 * cleanup (React 19 StrictMode re-runs effects — see CLAUDE.md).
 */
export function useTrackProgress(ref: RefObject<HTMLElement | null>): number {
  const [prog, setProg] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const rect = el.getBoundingClientRect()
        const total = Math.max(1, rect.height - window.innerHeight)
        setProg(clamp01(-rect.top / total))
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
      raf = 0
    }
  }, [ref])
  return prog
}

/** Live media-query flag (e.g. '(hover: none)', '(max-width: 720px)'). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}
