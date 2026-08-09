/**
 * Palette contrast check — `npm run contrast`.
 *
 * Every text/surface pair in the system, measured against WCAG AA (4.5:1 body,
 * 3:1 controls and focus indicators). The rule this enforces is the one that is
 * easy to get wrong by eye: a colour is checked against the *darkest* surface it
 * can actually land on — the card stage, not the page — because a tertiary that
 * passes on the canvas and fails on the panel is not passing.
 *
 * Values are read out of styles/global.css and styles/worlds.css rather than
 * duplicated here, so this cannot drift from the stylesheets. Add a `check()`
 * whenever you add a role or a world; do not eyeball a new value.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css =
  fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8') +
  fs.readFileSync(path.join(root, 'src/styles/worlds.css'), 'utf8')

/**
 * Every `--name: <hex | var(--other)>` in the stylesheets, keyed by the block it
 * sits in — so `[data-world='ply'] --text` is not the global `--text`. Values
 * are read out of the CSS rather than duplicated here, so this file cannot
 * drift from what actually ships.
 */
function tokens() {
  const out = new Map()
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const scope = (selector.match(/\[data-world='(\w+)'\]/) || [])[1] ?? ':root'
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}|var\(--[\w-]+\))\s*;/g)) {
      out.set(`${scope}${name}`, value)
    }
  }
  return out
}
const T = tokens()

/** Resolve a role to a hex, following var() chains and falling back to :root. */
const v = (scope, name, seen = new Set()) => {
  if (seen.has(name)) throw new Error(`circular token: ${name}`)
  seen.add(name)
  const hit = T.get(`${scope}${name}`) ?? T.get(`:root${name}`)
  if (!hit) throw new Error(`no value found for ${name} in ${scope}`)
  const ref = hit.match(/^var\((--[\w-]+)\)$/)
  return ref ? v(scope, ref[1], seen) : hit
}

const channels = (h) => {
  h = h.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const toLinear = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4)
const luminance = (hex) => {
  const [r, g, b] = channels(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const rows = []
/** @param need 4.5 for body text, 3 for controls and focus indicators */
const check = (label, fg, bg, need = 4.5) => {
  const r = ratio(fg, bg)
  rows.push({ label, fg, bg, r, need, ok: r >= need })
}
/** the three text steps of a scope, each against that scope's deepest surface */
const ramp = (scope, name) => {
  const deepest = v(scope, '--surface-sunk')
  for (const step of ['--text', '--text-2', '--text-3']) {
    check(`${name} ${step} on its stage`, v(scope, step), deepest)
    check(`${name} ${step} on its canvas`, v(scope, step), v(scope, '--surface'))
  }
  check(`${name} accent as text`, v(scope, '--accent-text'), v(scope, '--surface'))
  check(`${name} accent as text on raised`, v(scope, '--accent-text'), v(scope, '--surface-raised'))
  check(`${name} focus ring`, v(scope, '--focus'), v(scope, '--surface'), 3)
  check(`${name} primary action label`, v(scope, '--action-text'), v(scope, '--action'))
  check(`${name} hovered action label`, v(scope, '--action-hover-text'), v(scope, '--action-hover'))
}

// ── the house, and the four worlds ───────────────────────────
ramp(':root', 'house')
for (const w of ['timbers', 'doors', 'ply', 'wpc']) ramp(w, w)

// ── the dark bands, which are global chrome and never themed ──
for (const [name, band] of [['night', '--night'], ['deep', '--deep'], ['portal', '--deep2']]) {
  check(`cream-on-dark over ${name}`, v(':root', '--cream-on-dark'), v(':root', band))
  check(`lamp2 over ${name}`, v(':root', '--lamp2'), v(':root', band))
  check(`lamp3 over ${name}`, v(':root', '--lamp3'), v(':root', band))
}
check('gold-light over night', v(':root', '--gold-l'), v(':root', '--night'))
check('gold over night (rule)', v(':root', '--gold'), v(':root', '--night'), 3)
check('cart badge label on brass', v(':root', '--deep'), v(':root', '--brass'))

// ── status, on the surfaces each one actually uses ───────────
check('fault text on its surface', v(':root', '--clay-ink'), v(':root', '--clay-surface'))
check('fault text on paper', v(':root', '--clay-ink'), v(':root', '--cream'))
check('fault border on paper', v(':root', '--clay'), v(':root', '--cream'), 3)
check('confirm text on its surface', v(':root', '--slate'), v(':root', '--slate-surface'))
check('confirm text on paper', v(':root', '--slate'), v(':root', '--cream'))
check('confirm mark on the toast', v(':root', '--slate-lit'), v(':root', '--ink'), 3)
check('caution text on paper', v(':root', '--teak-ink'), v(':root', '--cream'))

const pad = (s, n) => String(s).padEnd(n)
console.log(pad('pair', 40) + pad('fg', 10) + pad('on', 10) + pad('ratio', 9) + 'need')
console.log('─'.repeat(74))
for (const r of rows) {
  console.log(
    pad(r.label, 40) + pad(r.fg, 10) + pad(r.bg, 10) + pad(r.r.toFixed(2) + ':1', 9) + `${r.need}:1  ` + (r.ok ? 'ok' : 'FAIL'),
  )
}
const failed = rows.filter((r) => !r.ok)
console.log(`\n${rows.length} pairs checked, ${failed.length} failing`)
if (failed.length) process.exit(1)
