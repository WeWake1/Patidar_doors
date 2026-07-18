export function fmtINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

/** Human-friendly order reference, e.g. PD-4K7QZ2 */
export function makeOrderId(): string {
  const t = Date.now().toString(36).slice(-4).toUpperCase()
  const r = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `PD-${t}${r}`
}
