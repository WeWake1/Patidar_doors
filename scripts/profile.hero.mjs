/**
 * Profiles the keyhole hero on the compositor at a REAL device scale factor.
 *
 * Parks the page at a list of progress values — out by touch gesture, back by
 * touch gesture — and prints, per cc layer, the tile memory, ideal vs raster
 * scale and tilings from a `disabled-by-default-cc.debug`
 * `LayerTreeHostImpl:snapshot`, mapped to DOM nodes through the CDP
 * `LayerTree` domain. This is the measurement that found the scroll-back
 * corruption on phones (CLAUDE.md, the keyhole-hero bullets): 470–510 MB of
 * tiles mid-flight against Chrome Android's 256 MB budget.
 *
 * ⚠️ **Chrome is launched with `--force-device-scale-factor`, not Playwright's
 * `deviceScaleFactor`.** The emulated DPR changes `devicePixelRatio` and the
 * screenshot size and NOT what the compositor rasterises — the snapshot reports
 * `device_scale: 1` under it, and every number is ~12× too small. The forced
 * factor goes through Blink's zoom and cc sees it.
 *
 *   BASE=http://localhost:5199 npm run profile:hero
 *   PS=0,0.31,0.62,back0.31,back0 DPR=3.5 W=412 H=915 TOP=10 CSS='…' node scripts/profile.hero.mjs
 *
 * PS is the list of progress values; a `back` prefix means "reached by
 * scrolling up with touch gestures", so `0.95,back0` is one out-and-back.
 * CSS injects a stylesheet, for bisecting. Snapshot fields: tile memory in MB,
 * `ideal` (what the layer is drawn at) vs `raster` (what its tiles were made
 * at) as multiples of 1×, and each tiling's scale × tile count.
 */
import { chromium } from 'playwright-core'

const BASE = process.env.BASE ?? 'http://localhost:5199'
const W = +(process.env.W ?? 412), H = +(process.env.H ?? 915), DPR = +(process.env.DPR ?? 3.5)
const TAG = process.env.TAG ?? 'run'
const CSS = process.env.CSS ?? ''
const PS = (process.env.PS ?? '0,0.2,0.31,0.39,0.46,0.54,0.62,0.7,0.95,back0.62,back0.54,back0.46,back0.39,back0.31,back0.2,back0').split(',')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ⚠️ the forced factor, never `deviceScaleFactor` on the context — see the header */
const browser = await chromium.launch({
  channel: 'chrome',
  headless: !process.env.HEADED,
  args: [`--force-device-scale-factor=${DPR}`, ...(process.env.FLAGS ?? '').split(' ').filter(Boolean)],
})
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: W < 600, hasTouch: W < 600 })
const page = await ctx.newPage()
if (CSS) await page.addInitScript((css) => {
  document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = css; document.head.append(s) })
}, CSS)
await page.goto(BASE, { waitUntil: 'load' })
await page.waitForTimeout(2500)
await page.addStyleTag({ content: '.kgate__key,.kgate__lock::before{animation:none!important}' })
const cdp = await ctx.newCDPSession(page)
const geom = await page.evaluate(() => {
  const el = document.querySelector('.portal--keyhole')
  return { top: el.offsetTop, span: el.offsetHeight - window.innerHeight }
})
await cdp.send('DOM.enable')
await cdp.send('DOM.getDocument', { depth: 0 })
let layers = []
cdp.on('LayerTree.layerTreeDidChange', (e) => { if (e.layers) layers = e.layers })
await cdp.send('LayerTree.enable')
const nodeNames = new Map()
async function nameOf(backendNodeId) {
  if (!backendNodeId) return '(no node)'
  if (nodeNames.has(backendNodeId)) return nodeNames.get(backendNodeId)
  let name = '?'
  try {
    const { node } = await cdp.send('DOM.describeNode', { backendNodeId })
    const attrs = node.attributes ?? []
    const cls = attrs[attrs.indexOf('class') + 1]
    name = node.nodeName === '#document' ? 'document' : `${node.localName}${attrs.includes('class') ? '.' + cls.split(' ').join('.') : ''}`
    if (node.localName === 'img') name += `[${(attrs[attrs.indexOf('src') + 1] ?? '').split('/').pop().slice(0, 18)}]`
  } catch {}
  nodeNames.set(backendNodeId, name)
  return name
}

async function snapshot(label, attempt = 0) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  const events = []
  const onData = (e) => events.push(...e.value)
  cdp.on('Tracing.dataCollected', onData)
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r))
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['disabled-by-default-cc.debug'], excludedCategories: ['*'] }, transferMode: 'ReportEvents' })
  /* The snapshot is emitted when the compositor activates a new tree, so force
     a commit: repaint a 1px probe that touches nothing in the hero. A custom
     property alone recalcs style without painting and produces no frame. */
  await page.evaluate(() => new Promise((r) => {
    let probe = document.getElementById('kt-probe')
    if (!probe) {
      probe = document.createElement('div')
      probe.id = 'kt-probe'
      probe.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;z-index:9999;pointer-events:none;opacity:0.02'
      document.body.append(probe)
    }
    probe.style.background = `rgb(${Math.floor(Math.random() * 255)},0,0)`
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150)))
  }))
  await cdp.send('Tracing.end')
  await done
  cdp.off('Tracing.dataCollected', onData)
  /* ⚠️ Every compositor in the browser emits one of these, the browser's own UI
     included — take the tree that holds the page, not the last one to arrive, or
     you profile the toolbar and read 0 MB. */
  const states = events
    .filter((e) => e.name === 'LayerTreeHostImpl:snapshot' && e.args?.snapshot)
    .filter((e) => (e.args.snapshot.active_tree?.layers ?? []).some((l) => (l.layer_name ?? '').includes('LayoutView')))
  const st = states.at(-1)?.args.snapshot
  /* the snapshot is emitted on a compositor frame, and a parked page does not
     always produce one inside the trace window — nudge again, up to three times */
  if (!st) {
    if (attempt < 3) return snapshot(label, attempt + 1)
    console.log(`  ${label}: no LayerTreeHostImpl snapshot in the trace (events=${events.length})`)
    return
  }
  const tree = st.active_tree ?? st.activeTree ?? st
  const list = tree.layers ?? []
  const domById = new Map(layers.map((l) => [String(l.layerId), l]))
  const rows = []
  let total = 0
  for (const l of list) {
    const mem = l.gpu_memory_usage ?? 0
    total += mem
    const dom = domById.get(String(l.layer_id))
    const name = dom ? await nameOf(dom.backendNodeId) : '(?)'
    /* ⚠️ `Number(x ?? 0)`, not `+x ?? 0` — the unary plus binds tighter than the
       `??`, so the fallback is unreachable and a missing scale prints NaN. */
    const til = (l.tilings ?? []).map((t) => `${Number(t.content_scale ?? 0).toFixed(2)}x${t.num_tiles ?? '?'}`).join(' ')
    rows.push({ id: l.layer_id, name, mem, bounds: l.bounds, til })
  }
  rows.sort((a, b) => b.mem - a.mem)
  const byPtr = new Map(list.map((l) => [String(l.id).split('/').pop(), l]))
  const surfaces = (tree.render_surface_layer_list ?? []).map((r) => byPtr.get(r.id_ref)).filter(Boolean)
  const tm = st.tile_manager_basic_state ?? {}
  console.log(`  ${label}: layers=${list.length} totalTileMem=${(total / 1048576).toFixed(1)}MB surfaces=${surfaces.length} oom=${tm.did_oom_on_last_assign} limit=${((tm.global_state?.hard_memory_limit_in_bytes ?? 0) / 1048576).toFixed(0)}MB`)
  console.log(`     surfaces: ${surfaces.map((l) => (l.layer_name ?? '').replace(/^Layout\w+ (\([^)]*\) )?/, '').replace(/class='([^' ]+).*/, '.$1').slice(0, 26) + '#' + l.layer_id).join(' | ')}`)
  for (const r of rows.slice(0, +(process.env.TOP ?? 12))) {
    const l = list.find((x) => x.layer_id === r.id)
    const nm = (l.layer_name ?? r.name).replace(/^Layout\w+ (\([^)]*\) )?/, '').replace(/class='([^']+)'/, '.$1')
    console.log(`     ${(r.mem / 1048576).toFixed(1).padStart(6)}MB #${String(r.id).padEnd(3)} ${nm.padEnd(40).slice(0, 40)} ideal=${(l.ideal_scales?.contents_scale?.[0] ?? 0).toFixed(2)} raster=${(l.raster_scales?.contents_scale?.[0] ?? 0).toFixed(2)} tilings=[${r.til}] b=${r.bounds.width}x${r.bounds.height}`)
  }
}

console.log(`[${TAG}] ${W}x${H} @ ${DPR}× (forced) span=${geom.span}  — tile memory per cc layer, ideal vs raster scale`)
for (const s of PS) {
  const back = s.startsWith('back')
  const p = +s.replace('back', '')
  if (back) {
    const targetY = geom.top + geom.span * p
    let steps = 0
    while ((await page.evaluate(() => window.scrollY)) > targetY + 4 && steps++ < 30) {
      const y = await page.evaluate(() => window.scrollY)
      await cdp.send('Input.synthesizeScrollGesture', { x: W / 2, y: H * 0.6, xDistance: 0, yDistance: Math.min(500, y - targetY), gestureSourceType: 'touch', speed: 1200 })
      await sleep(60)
    }
  } else {
    const targetY = geom.top + geom.span * p
    let steps = 0
    while ((await page.evaluate(() => window.scrollY)) < targetY - 4 && steps++ < 30) {
      const y = await page.evaluate(() => window.scrollY)
      await cdp.send('Input.synthesizeScrollGesture', { x: W / 2, y: H * 0.6, xDistance: 0, yDistance: -Math.min(500, targetY - y), gestureSourceType: 'touch', speed: 1200 })
      await sleep(60)
    }
  }
  await sleep(500)
  const y = await page.evaluate(() => window.scrollY)
  await snapshot(`${s} (p=${((y - geom.top) / geom.span).toFixed(3)})`)
}
await browser.close()
