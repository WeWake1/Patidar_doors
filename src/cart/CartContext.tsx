import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { getProduct, getSize, getTone, priceFor } from '../data/products'

export interface CartLine {
  /** productId|sizeId|toneId */
  key: string
  productId: string
  sizeId: string
  toneId: string
  qty: number
}

export interface CartLineView extends CartLine {
  name: string
  art: string
  sizeLabel: string
  toneName: string
  unitPrice: number
  lineTotal: number
}

interface CartState {
  lines: CartLine[]
}

type CartAction =
  | { type: 'add'; productId: string; sizeId: string; toneId: string; qty?: number }
  | { type: 'setQty'; key: string; delta: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' }

const STORAGE_KEY = 'patidar.cart.v1'
const OLD_STORAGE_KEY = 'doorswala.cart.v1'

function lineKey(productId: string, sizeId: string, toneId: string): string {
  return `${productId}|${sizeId}|${toneId}`
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.productId, action.sizeId, action.toneId)
      const existing = state.lines.find((l) => l.key === key)
      const lines = existing
        ? state.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + (action.qty ?? 1) } : l))
        : [...state.lines, { key, productId: action.productId, sizeId: action.sizeId, toneId: action.toneId, qty: action.qty ?? 1 }]
      return { lines }
    }
    case 'setQty': {
      const lines = state.lines
        .map((l) => (l.key === action.key ? { ...l, qty: l.qty + action.delta } : l))
        .filter((l) => l.qty > 0)
      return { lines }
    }
    case 'remove':
      return { lines: state.lines.filter((l) => l.key !== action.key) }
    case 'clear':
      return { lines: [] }
  }
}

function loadInitial(): CartState {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Migrate from the pre-rebrand key.
      raw = localStorage.getItem(OLD_STORAGE_KEY)
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw)
        localStorage.removeItem(OLD_STORAGE_KEY)
      }
    }
    if (!raw) return { lines: [] }
    const parsed = JSON.parse(raw) as CartState
    if (!Array.isArray(parsed.lines)) return { lines: [] }
    // Drop lines whose product no longer exists in the catalog.
    return { lines: parsed.lines.filter((l) => getProduct(l.productId)) }
  } catch {
    return { lines: [] }
  }
}

interface CartContextValue {
  lines: CartLineView[]
  count: number
  subtotal: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  add: (productId: string, sizeId: string, toneId: string, qty?: number) => void
  setQty: (key: string, delta: number) => void
  remove: (key: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)
  const [isOpen, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage full / private mode — cart just won't persist
    }
  }, [state])

  const value = useMemo<CartContextValue>(() => {
    const lines: CartLineView[] = state.lines.flatMap((l) => {
      const product = getProduct(l.productId)
      if (!product) return []
      const size = getSize(l.sizeId)
      const tone = getTone(product, l.toneId)
      const unitPrice = priceFor(product, l.sizeId, l.toneId)
      return [
        {
          ...l,
          name: product.name,
          art: product.art,
          sizeLabel: size.label,
          toneName: tone.name,
          unitPrice,
          lineTotal: unitPrice * l.qty,
        },
      ]
    })
    return {
      lines,
      count: lines.reduce((a, l) => a + l.qty, 0),
      subtotal: lines.reduce((a, l) => a + l.lineTotal, 0),
      isOpen,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      add: (productId, sizeId, toneId, qty) => dispatch({ type: 'add', productId, sizeId, toneId, qty }),
      setQty: (key, delta) => dispatch({ type: 'setQty', key, delta }),
      remove: (key) => dispatch({ type: 'remove', key }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [state, isOpen])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
