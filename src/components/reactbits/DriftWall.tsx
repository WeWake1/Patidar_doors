import type React from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './DriftWall.css'

/*
 * reactbits DriftWall, ported to TS. Local changes on top of the registry copy:
 *  · items carry `srcSet`/`sizes` so the tiles use the 480w webp from our own
 *    image pipeline instead of a single full-size file;
 *  · `onSelect` + `selectedIndex` — clicking a tile is what drives the big
 *    viewer next to the wall, and the picked photo keeps a ring while it drifts;
 *  · the column ref callback has a block body (React 19 treats a returned value
 *    from a ref callback as a cleanup function and throws).
 */

export interface DriftWallItem {
  image: string
  srcSet?: string
  sizes?: string
  title?: string
  href?: string
}

interface DriftWallProps {
  items?: DriftWallItem[]
  columns?: number
  tileWidth?: number
  tileHeight?: number
  gap?: number
  radius?: number
  tilt?: number
  turn?: number
  roll?: number
  perspective?: number
  depth?: number
  speed?: number
  direction?: 'up' | 'down'
  variance?: number
  parallax?: number
  pauseOnHover?: boolean
  lift?: number
  fade?: number
  dim?: number
  grayscale?: boolean
  overlayColor?: string
  /** index into `items` of the tile that should stay lit */
  selectedIndex?: number
  onSelect?: (item: DriftWallItem, index: number) => void
  /**
   * Accessible name for the wall as a whole. Third local addition on top of the
   * registry component (see the two in `DoorWall.tsx`'s notes): the hardcoded
   * default describes the widget rather than what is in it, so a screen reader
   * on the home page heard "drifting wall of tiles" where the visible heading
   * says the doors are standing in the store. Defaults to the registry string,
   * so this stays a superset and the file stays re-syncable.
   */
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_ITEMS: DriftWallItem[] = Array.from({ length: 15 }, (_, i) => {
  const ids = [1015, 1025, 1039, 1043, 1044, 1050, 1062, 1069, 1074, 1080, 1084, 106, 110, 133, 164]
  return { image: `https://picsum.photos/id/${ids[i % ids.length]}/600/400`, title: `Tile ${i + 1}` }
})

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const columnFactor = (index: number, variance: number) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1
  return 1 + variance * pseudo
}

const DriftWall: React.FC<DriftWallProps> = ({
  items = DEFAULT_ITEMS,
  columns = 5,
  tileWidth = 200,
  tileHeight = 132,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = 'up',
  variance = 0.45,
  parallax = 0.6,
  pauseOnHover = false,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  grayscale = false,
  overlayColor = '#060010',
  selectedIndex = -1,
  onSelect,
  ariaLabel = 'Drifting wall of tiles',
  className = '',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const trackRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)

  const offsetsRef = useRef<number[]>([])
  const velocitiesRef = useRef<number[]>([])
  const hoveredColRef = useRef(-1)
  const wallHoveredRef = useRef(false)
  const pointerRef = useRef({ x: 0, y: 0 })
  const pointerDampedRef = useRef({ x: 0, y: 0 })
  const lastTsRef = useRef<number | null>(null)

  const [containerHeight, setContainerHeight] = useState(600)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(prefersReducedMotion())
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // entries keep their index in `items` so a click can report which photo it was
  const columnItems = useMemo(() => {
    const cols: { item: DriftWallItem; index: number }[][] = Array.from({ length: columns }, () => [])
    items.forEach((item, i) => cols[i % columns].push({ item, index: i }))
    return cols.map((col) => (col.length ? col : [{ item: items[0], index: 0 }]))
  }, [items, columns])

  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap
    return columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit)
      const copies = Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1)
      return { copyHeight, copies }
    })
  }, [columnItems, tileHeight, gap, containerHeight])

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height || 600)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const baseVelocities = useMemo(() => {
    const dirSign = direction === 'up' ? 1 : -1
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1
      return speed * columnFactor(c, variance) * dirSign * altSign
    })
  }, [columnItems, speed, direction, variance])

  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, c) => meta.copyHeight * ((c * 0.37) % 1))
    velocitiesRef.current = columnItems.map(() => 0)
  }, [columnMeta, columnItems])

  const applyPlaneTransform = useCallback(
    (px: number, py: number) => {
      const plane = planeRef.current
      if (!plane) return
      plane.style.transform =
        `translate(-50%, -50%) scale(1.18) ` +
        `rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) ` +
        `translateZ(${-depth}px)`
    },
    [tilt, turn, roll, depth],
  )

  useEffect(() => {
    const animate = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000)
      lastTsRef.current = ts

      const maxTilt = parallax * 8
      const targetX = pointerRef.current.x * maxTilt
      const targetY = -pointerRef.current.y * maxTilt
      const damp = 1 - Math.exp(-dt / 0.12)
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y)

      if (!reduced) {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const meta = columnMeta[c]
          if (!meta) continue
          const paused = wallHoveredRef.current && pauseOnHover
          const factor = paused || hoveredColRef.current === c ? 0 : 1
          const target = baseVelocities[c] * factor

          const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28))
          velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease
          let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight
          offsetsRef.current[c] = next

          const el = trackRefs.current[c]
          if (el) el.style.transform = `translate3d(0, ${-next}px, 0)`
        }
      } else {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const el = trackRefs.current[c]
          const meta = columnMeta[c]
          if (el && meta) el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0)}px, 0)`
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [baseVelocities, columnMeta, pauseOnHover, parallax, reduced, applyPlaneTransform])

  const activate = useCallback((id: string, index: number) => {
    activeIdRef.current = id
    hoveredColRef.current = index
    setActiveId(id)
  }, [])
  const release = useCallback(() => {
    activeIdRef.current = null
    hoveredColRef.current = -1
    setActiveId(null)
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      if (parallax > 0 && !reduced) {
        pointerRef.current = {
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        }
      }
      const hit = document.elementFromPoint(e.clientX, e.clientY)
      const tile = hit?.closest?.('[data-tile-id]') as HTMLElement | null
      if (!tile) return
      const id = tile.dataset.tileId!
      if (id === activeIdRef.current) return
      activeIdRef.current = id
      hoveredColRef.current = Number(tile.dataset.col)
      setActiveId(id)
    },
    [parallax, reduced],
  )

  /**
   * Which tile is under (x, y)?
   *
   * `elementFromPoint` is the fast path but it still gives up near the edges of
   * the rotated plane and answers with the column instead of the tile, so a
   * click there would land on nothing. Falling back to the tiles' projected
   * boxes costs a layout read, which is fine on a click (never on pointermove).
   */
  const tileAt = useCallback((x: number, y: number): HTMLElement | null => {
    const root = containerRef.current
    if (!root) return null
    const direct = document.elementFromPoint(x, y)?.closest('[data-tile-id]') as HTMLElement | null
    if (direct && root.contains(direct)) return direct
    let best: HTMLElement | null = null
    let bestDist = Infinity
    for (const el of root.querySelectorAll<HTMLElement>('[data-tile-id]')) {
      const r = el.getBoundingClientRect()
      if (!r.width || x < r.left || x > r.right || y < r.top || y > r.bottom) continue
      const dist = Math.hypot(x - (r.left + r.right) / 2, y - (r.top + r.bottom) / 2)
      if (dist < bestDist) {
        bestDist = dist
        best = el
      }
    }
    return best
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onSelect) return
      const tile = tileAt(e.clientX, e.clientY)
      const idx = tile ? Number(tile.dataset.idx) : NaN
      if (Number.isNaN(idx) || !items[idx]) return
      onSelect(items[idx], idx)
    },
    [onSelect, items, tileAt],
  )

  const handlePointerLeaveWall = useCallback(() => {
    wallHoveredRef.current = false
    pointerRef.current = { x: 0, y: 0 }
    release()
  }, [release])

  const cssVars = useMemo(
    () =>
      ({
        '--dw-tile-w': `${tileWidth}px`,
        '--dw-tile-h': `${tileHeight}px`,
        '--dw-gap': `${gap}px`,
        '--dw-radius': `${radius}px`,
        '--dw-perspective': `${perspective}px`,
        // `lift` stays a translateZ distance in the API; the tile is flattened
        // for hit testing (see DriftWall.css), so convert it to the scale that
        // same translateZ would have produced at this depth.
        '--dw-pop': 1 + lift / Math.max(1, perspective + depth - lift),
        '--dw-dim': dim,
        '--dw-gray': grayscale ? 1 : 0,
        '--dw-overlay': overlayColor,
        '--dw-edge': `${Math.max(0, (1 - fade) * 100)}%`,
        ...style,
      }) as React.CSSProperties,
    [tileWidth, tileHeight, gap, radius, perspective, lift, depth, dim, grayscale, overlayColor, fade, style],
  )

  const renderTile = (item: DriftWallItem, index: number, id: string, colIndex: number) => {
    const inner = (
      <span className="drift-wall__inner">
        <img
          src={item.image}
          srcSet={item.srcSet}
          sizes={item.sizes}
          alt={item.title ?? ''}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="drift-wall__overlay" aria-hidden="true" />
      </span>
    )
    const cls =
      'drift-wall__tile' +
      (activeId === id ? ' is-active' : '') +
      (selectedIndex === index ? ' is-selected' : '')
    const commonProps = {
      className: cls,
      'data-tile-id': id,
      'data-idx': index,
      'data-col': colIndex,
      onFocus: () => activate(id, colIndex),
      onBlur: release,
    }
    if (item.href) {
      return (
        <a key={id} href={item.href} target="_blank" rel="noreferrer noopener" {...commonProps}>
          {inner}
        </a>
      )
    }
    return (
      <div
        key={id}
        tabIndex={0}
        role="button"
        aria-label={item.title ?? 'tile'}
        aria-pressed={onSelect ? selectedIndex === index : undefined}
        /* the click itself is delegated to the wall (see `handleClick`) */
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect?.(item, index)
          }
        }}
        {...commonProps}
      >
        {inner}
      </div>
    )
  }

  const rootClass = ['drift-wall', reduced ? 'drift-wall--reduced' : '', className].filter(Boolean).join(' ')

  return (
    <div
      ref={containerRef}
      className={rootClass}
      style={cssVars}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      onPointerEnter={() => {
        wallHoveredRef.current = true
      }}
      onPointerLeave={handlePointerLeaveWall}
      role="group"
      aria-label={ariaLabel}
    >
      <div ref={planeRef} className="drift-wall__plane">
        {columnItems.map((col, c) => {
          const meta = columnMeta[c]
          const copies = Array.from({ length: meta.copies })
          return (
            <div className="drift-wall__col" key={`col-${c}`}>
              <div
                className="drift-wall__track"
                ref={(el) => {
                  trackRefs.current[c] = el
                }}
              >
                {copies.map((_, copyIndex) =>
                  col.map(({ item, index }, itemIndex) =>
                    renderTile(item, index, `${c}-${copyIndex}-${itemIndex}`, c),
                  ),
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DriftWall
