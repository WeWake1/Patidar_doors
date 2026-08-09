import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Fades/rises children in when they enter the viewport.
 *
 * `as` exists so a reveal can be the list item it is semantically — the home
 * page's payment sequence is an <ol>, and a bare <div> child would drop the
 * list semantics a screen reader uses to count the steps.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li'
}) {
  const ref = useRef<HTMLDivElement & HTMLLIElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add('reveal--in')
            io.disconnect()
          }
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} className={`reveal${className ? ' ' + className : ''}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  )
}
