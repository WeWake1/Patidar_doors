export interface OrderCustomer {
  name: string
  phone: string
  email: string
  address: string
  city: string
  pincode: string
  slot: string
  notes: string
}

export interface OrderLineSnapshot {
  name: string
  sizeLabel: string
  toneName: string
  qty: number
  unitPrice: number
  lineTotal: number
}

export interface LastOrder {
  id: string
  ts: number
  subtotal: number
  waUrl: string
  customer: OrderCustomer
  lines: OrderLineSnapshot[]
}

const KEY = 'doorswala.lastOrder.v1'

export function saveLastOrder(order: LastOrder) {
  try {
    localStorage.setItem(KEY, JSON.stringify(order))
  } catch {
    // best-effort only
  }
}

export function loadLastOrder(): LastOrder | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LastOrder) : null
  } catch {
    return null
  }
}
