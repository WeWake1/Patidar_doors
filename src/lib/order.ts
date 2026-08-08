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
  /**
   * The made-to-measure options, already flattened to a string. Optional
   * because orders placed before the configurator shipped have no such line.
   */
  optsLabel?: string
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

const KEY = 'patidar.lastOrder.v1'
const OLD_KEY = 'doorswala.lastOrder.v1'

export function saveLastOrder(order: LastOrder) {
  try {
    localStorage.setItem(KEY, JSON.stringify(order))
  } catch {
    // best-effort only
  }
}

export function loadLastOrder(): LastOrder | null {
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) {
      // Migrate from the pre-rebrand key.
      raw = localStorage.getItem(OLD_KEY)
      if (raw) {
        localStorage.setItem(KEY, raw)
        localStorage.removeItem(OLD_KEY)
      }
    }
    return raw ? (JSON.parse(raw) as LastOrder) : null
  } catch {
    return null
  }
}
