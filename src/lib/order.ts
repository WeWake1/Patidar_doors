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
  toneName: string | null
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
  /**
   * True when `window.open` was refused (pop-up blocker, in-app browser). The
   * confirmation page leads with the button instead of the receipt in that
   * case — the customer has *not* seen WhatsApp and doesn't know it.
   */
  blocked?: boolean
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

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/**
 * Coerce whatever is in storage into a `LastOrder`, or return null.
 *
 * `JSON.parse` alone was a cast, not a check: anything that survived parsing
 * was handed to the page as a valid order, and the confirmation page reads
 * `customer.name.split(' ')` and maps `lines` on the first render. A truncated
 * write (storage quota hit mid-`setItem`), a hand-edited entry, or a value
 * left by an older schema therefore threw during render rather than falling
 * back to the "nothing to send" state that already exists for this case.
 */
function coerce(raw: unknown): LastOrder | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = str(o.id)
  const waUrl = str(o.waUrl)
  // Without these two the page has nothing to show and nothing to send.
  if (!id || !waUrl) return null

  const c = (typeof o.customer === 'object' && o.customer ? o.customer : {}) as Record<string, unknown>
  const lines = Array.isArray(o.lines) ? o.lines : []

  return {
    id,
    waUrl,
    ts: num(o.ts),
    subtotal: num(o.subtotal),
    blocked: o.blocked === true,
    customer: {
      name: str(c.name),
      phone: str(c.phone),
      email: str(c.email),
      address: str(c.address),
      city: str(c.city),
      pincode: str(c.pincode),
      slot: str(c.slot),
      notes: str(c.notes),
    },
    lines: lines.flatMap((l): OrderLineSnapshot[] => {
      if (!l || typeof l !== 'object') return []
      const r = l as Record<string, unknown>
      return [
        {
          name: str(r.name),
          sizeLabel: str(r.sizeLabel),
          /* Null is a real answer here — a photographed door has no finish to
             choose — so this must not be flattened to `''` by `str`. */
          toneName: typeof r.toneName === 'string' && r.toneName ? r.toneName : null,
          optsLabel: typeof r.optsLabel === 'string' ? r.optsLabel : undefined,
          qty: num(r.qty),
          unitPrice: num(r.unitPrice),
          lineTotal: num(r.lineTotal),
        },
      ]
    }),
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
    return raw ? coerce(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
